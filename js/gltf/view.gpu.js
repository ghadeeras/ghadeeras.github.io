import * as aether from "aether";
import { gpu } from "lumen";
import { gltf, gltf_gpu } from "../djee/index.js";
const uniformsStruct = gpu.struct({
    mat: gpu.struct({
        positions: gpu.mat4x4,
        normals: gpu.mat4x4,
    }),
    projectionMat: gpu.mat4x4,
    color: gpu.f32.x4,
    lightPos: gpu.f32.x4,
    shininess: gpu.f32,
    lightRadius: gpu.f32,
    fogginess: gpu.f32,
});
export class GPUView {
    constructor(device, shaderModule, canvasId) {
        this.device = device;
        this.shaderModule = shaderModule;
        this.renderer = null;
        this._viewMatrix = aether.mat4.identity();
        this._modelMatrix = aether.mat4.identity();
        this.perspective = gltf.graph.defaultPerspective();
        this.gpuCanvas = device.canvas(canvasId, 4);
        this.depthTexture = this.gpuCanvas.depthTexture();
        this.uniforms = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, uniformsStruct.paddedSize);
        this.uniformsGroupLayout = device.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform",
                    },
                }],
        });
        this.uniformsGroup = device.bindGroup(this.uniformsGroupLayout, [this.uniforms]);
        this.rendererFactory = new gltf_gpu.GPURendererFactory(this.device, 1, { POSITION: 0, NORMAL: 1 }, (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState));
        this.pipelineLayout = this.device.device.createPipelineLayout({
            bindGroupLayouts: [this.uniformsGroupLayout, this.rendererFactory.matricesGroupLayout],
        });
        this.fragmentState = this.shaderModule.fragmentState("f_main", [this.gpuCanvas]);
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
        this.uniforms.set(uniformsStruct.members.color, color);
    }
    set lightPosition(p) {
        this.uniforms.set(uniformsStruct.members.lightPos, [...p, 1]);
    }
    set lightRadius(r) {
        this.uniforms.set(uniformsStruct.members.lightRadius, r);
    }
    set shininess(s) {
        this.uniforms.set(uniformsStruct.members.shininess, s);
    }
    set fogginess(f) {
        this.uniforms.set(uniformsStruct.members.fogginess, f);
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
        this._viewMatrix = this.perspective.matrix;
        this._modelMatrix = this.perspective.modelMatrix;
        this.resetModelViewMatrix();
        if (this.renderer !== null) {
            this.renderer.destroy();
            this.renderer = null;
        }
        this.renderer = this.rendererFactory.newInstance(model);
        return model;
    }
    primitivePipeline(vertexLayouts, primitiveState) {
        const attributesCount = vertexLayouts.map(layout => [...layout.attributes].length).reduce((l1, l2) => l1 + l2, 0);
        return this.device.device.createRenderPipeline({
            layout: this.pipelineLayout,
            fragment: this.fragmentState,
            depthStencil: this.depthState,
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
            vertex: this.shaderModule.vertexState(attributesCount == 2 ? "v_main" : "v_main_no_normals", vertexLayouts),
            primitive: primitiveState,
        });
    }
    resize() {
        this.gpuCanvas.resize();
        this.depthTexture.resize(this.gpuCanvas.size);
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio, this.focalLength);
    }
    draw() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment(0)
            };
            encoder.renderPass(passDescriptor, pass => {
                if (this.renderer !== null) {
                    pass.setBindGroup(0, this.uniformsGroup);
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
    const shaderModule = await device.loadShaderModule("gltf.wgsl");
    return () => new GPUView(device, shaderModule, canvasId);
}
//# sourceMappingURL=view.gpu.js.map