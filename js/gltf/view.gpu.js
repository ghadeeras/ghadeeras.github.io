import * as aether from "aether";
import { gpu } from "lumen";
import { gltf, gltf_gpu } from "../djee/index.js";
import { gltfMaterialsStruct } from "../djee/gltf.gpu.js";
const uniformsStruct = gpu.struct({
    mat: gpu.struct({
        positions: gpu.mat4x4,
        normals: gpu.mat4x4,
    }),
    projectionMat: gpu.mat4x4,
    lightPos: gpu.f32.x4,
    material: gltfMaterialsStruct,
});
function uniformsGroupLayout(device) {
    return device.groupLayout({
        uniforms: gpu.uniform(uniformsStruct).asEntry(0, "VERTEX", "FRAGMENT"),
        clock: gpu.storage("read_write", gpu.u32).asEntry(1, "FRAGMENT"),
    });
}
function skyPipelineLayout(device, layout) {
    return device.pipelineLayout({
        uniforms: { group: 0, layout: layout }
    }, "sky pipeline layout");
}
export class GPUView {
    constructor(device, shaderModule, canvasId) {
        this.device = device;
        this.shaderModule = shaderModule;
        this.renderer = null;
        this._viewMatrix = aether.mat4.identity();
        this._modelMatrix = aether.mat4.identity();
        this._lightPosition = aether.vec4.of(0, 0, 1, 0);
        this.perspective = gltf.graph.defaultPerspective();
        this.gpuCanvas = device.canvas(canvasId, 4);
        this.depthTexture = this.gpuCanvas.depthTexture();
        this.uniforms = device.syncBuffer({
            label: "uniforms",
            usage: ["UNIFORM"],
            data: uniformsStruct.view([{
                    lightPos: this._lightPosition,
                    mat: {
                        positions: aether.mat4.identity(),
                        normals: aether.mat4.identity(),
                    },
                    projectionMat: aether.mat4.identity(),
                    material: {
                        baseColorFactor: aether.vec4.of(1.0, 1.0, 1.0, 1.0),
                        emissiveFactor: aether.vec3.of(1.0, 1.0, 1.0),
                        metallicFactor: 1.0,
                        roughnessFactor: 1.0,
                        alphaCutoff: 0.0
                    }
                }])
        });
        this.clock = device.dataBuffer({ usage: ["STORAGE"], data: gpu.u32.view([1]) });
        this.uniformsGroupLayout = uniformsGroupLayout(device);
        this.uniformsGroup = this.uniformsGroupLayout.bindGroup({
            uniforms: this.uniforms,
            clock: this.clock
        });
        this.rendererFactory = new gltf_gpu.GPURendererFactory(this.device, 1, 2, { POSITION: 0, NORMAL: 1, TANGENT: 2, TEXCOORD_BASE_COLOR: 3, TEXCOORD_METALLIC_ROUGHNESS: 4, TEXCOORD_TEXCOORD_EMISSIVE: 5, TEXCOORD_TEXCOORD_OCCLUSION: 6, TEXCOORD_TEXCOORD_NORMAL: 7 }, (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState));
        this.pipelineLayout = this.device.wrapped.createPipelineLayout({
            bindGroupLayouts: [this.uniformsGroupLayout.wrapped, this.rendererFactory.matricesGroupLayout, this.rendererFactory.materialsGroupLayout],
        });
        this.skyPipelineLayout = skyPipelineLayout(device, this.uniformsGroupLayout);
        this.skyPipeline = device.wrapped.createRenderPipeline({
            layout: this.skyPipelineLayout.wrapped,
            vertex: {
                module: this.shaderModule.wrapped,
                entryPoint: "v_sky",
            },
            fragment: {
                module: this.shaderModule.wrapped,
                entryPoint: "f_sky",
                targets: [{
                        format: this.gpuCanvas.srgbFormat
                    }],
            },
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
        });
        this.depthState = this.depthTexture.depthState({ depthCompare: "greater" });
    }
    get aspectRatio() {
        return this.gpuCanvas.element.width / this.gpuCanvas.element.height;
    }
    get focalLength() {
        const m = this.projectionMatrix;
        const fl = Math.max(m[0][0], m[1][1]);
        return fl > 0 ? fl : 2;
    }
    get canvas() {
        return this.gpuCanvas.element;
    }
    set modelColor(color) {
        this.uniforms.set(uniformsStruct.members.material.members.baseColorFactor, color);
    }
    get lightPosition() {
        return aether.vec3.from(this._lightPosition);
    }
    set lightPosition(p) {
        this._lightPosition = [...p, 0];
        this.uniforms.set(uniformsStruct.members.lightPos, aether.mat4.apply(this._viewMatrix, this._lightPosition));
    }
    set roughnessFactor(r) {
        this.uniforms.set(uniformsStruct.members.material.members.roughnessFactor, r);
    }
    set metallicFactor(m) {
        this.uniforms.set(uniformsStruct.members.material.members.metallicFactor, m);
    }
    get projectionMatrix() {
        return this.uniforms.get(uniformsStruct.members.projectionMat);
    }
    set projectionMatrix(m) {
        this.uniforms.set(uniformsStruct.members.projectionMat, m);
    }
    get viewMatrix() {
        return this._viewMatrix;
    }
    set viewMatrix(m) {
        this._viewMatrix = m;
        this.lightPosition = this.lightPosition;
        this.resetModelViewMatrix();
    }
    get modelMatrix() {
        return this._modelMatrix;
    }
    set modelMatrix(m) {
        this._modelMatrix = m;
        this.resetModelViewMatrix();
    }
    resetModelViewMatrix() {
        const mvMat = aether.mat4.mul(this._viewMatrix, this._modelMatrix);
        this.uniforms.set(uniformsStruct.members.mat, { normals: mvMat, positions: mvMat });
    }
    async loadModel(modelUri) {
        const model = await gltf.graph.Model.create(modelUri);
        this.perspective = model.scene.perspectives[0];
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio);
        this._lightPosition = aether.mat4.apply(aether.mat4.inverse(this.perspective.matrix), this.uniforms.get(uniformsStruct.members.lightPos));
        this.viewMatrix = this.perspective.matrix;
        this.modelMatrix = this.perspective.modelMatrix;
        this.resetModelViewMatrix();
        if (this.renderer !== null) {
            this.renderer.destroy();
            this.renderer = null;
        }
        this.renderer = await this.rendererFactory.newInstance(model);
        return model;
    }
    primitivePipeline(vertexLayouts, primitiveState) {
        return this.device.wrapped.createRenderPipeline({
            layout: this.pipelineLayout,
            vertex: {
                module: this.shaderModule.wrapped,
                entryPoint: "v_main",
                buffers: vertexLayouts
            },
            primitive: primitiveState,
            fragment: this.shaderModule.fragmentState("f_main", [this.gpuCanvas.srgbFormat]),
            depthStencil: this.depthState,
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
        });
    }
    resize() {
        this.gpuCanvas.resize();
        this.depthTexture.size = this.gpuCanvas.size;
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio, this.focalLength);
    }
    draw() {
        this.device.enqueueCommands("render", encoder => {
            const skyColorAttachment = this.gpuCanvas.attachment({ r: 0, g: 0, b: 0, a: 1 }, true);
            const colorAttachment = {
                ...skyColorAttachment,
                loadOp: "load",
            };
            skyColorAttachment.storeOp = "store";
            const passDescriptor = {
                colorAttachments: [colorAttachment],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment(0)
            };
            encoder.renderPass({ colorAttachments: [skyColorAttachment] }, pass => {
                pass.setPipeline(this.skyPipeline);
                this.skyPipelineLayout.addTo(pass, { uniforms: this.uniformsGroup });
                pass.draw(3);
            });
            encoder.renderPass(passDescriptor, pass => {
                if (this.renderer !== null) {
                    pass.setBindGroup(0, this.uniformsGroup.wrapped);
                    this.renderer.render(pass);
                }
            });
        });
    }
    get xrContext() {
        return null;
    }
}
export async function newViewFactory(canvasId) {
    const gpuParam = new URL(location.href).searchParams.get("gpu");
    if (gpuParam && gpuParam?.toUpperCase() == 'N') {
        throw new Error("Unsupported by choice");
    }
    const device = await gpu.Device.instance();
    const shaderModule = await device.shaderModule({ path: "shaders/gltf.wgsl" });
    return () => new GPUView(device, shaderModule, canvasId);
}
//# sourceMappingURL=view.gpu.js.map