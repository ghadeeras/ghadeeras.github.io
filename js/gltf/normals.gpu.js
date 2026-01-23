import * as aether from "aether";
import { gpu } from "lumen";
import { gltf, gltf_gpu } from "../djee/index.js";
const uniformsStruct = gpu.struct({
    mat: gpu.struct({
        positions: gpu.mat4x4,
        normals: gpu.mat4x4,
    }),
    projectionMat: gpu.mat4x4,
});
export class NormalsRenderer {
    constructor(shaderModule, depthTexture) {
        this.shaderModule = shaderModule;
        this.depthTexture = depthTexture;
        this.renderer = null;
        this._viewMatrix = aether.mat4.identity();
        this._modelMatrix = aether.mat4.identity();
        this.perspective = gltf.graph.defaultPerspective();
        this.device = shaderModule.device;
        this.uniforms = this.device.syncBuffer("uniforms", {
            usage: ["UNIFORM"],
            size: uniformsStruct.paddedSize
        });
        const uniformsGroupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform",
                    },
                }],
        });
        this.uniformsGroup = this.device.wrapped.createBindGroup({
            layout: uniformsGroupLayout,
            entries: [{
                    binding: 0,
                    resource: this.uniforms.asBindingResource()
                }]
        });
        this.rendererFactory = new gltf_gpu.GPURendererFactory(this.device, 1, { POSITION: 0, NORMAL: 1 }, (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState));
        this.pipelineLayout = this.device.device.createPipelineLayout({
            bindGroupLayouts: [uniformsGroupLayout, this.rendererFactory.matricesGroupLayout]
        });
        this.fragmentState = this.shaderModule.fragmentState("f_main", ["rgba32float"]);
        this.depthState = this.depthTexture.depthState({ depthCompare: "greater" });
    }
    get aspectRatio() {
        const m = this.projectionMatrix;
        const [sx, sy] = [m[0][0], m[1][1]];
        return sx === sy ? 1 : sy / sx;
    }
    get focalLength() {
        const m = this.projectionMatrix;
        const fl = Math.max(m[0][0], m[1][1]);
        return fl > 0 ? fl : 2;
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
        return this.device.device.createRenderPipeline({
            layout: this.pipelineLayout,
            fragment: this.fragmentState,
            depthStencil: this.depthState,
            vertex: this.shaderModule.vertexState("v_main", vertexLayouts),
            primitive: primitiveState,
        });
    }
    resize(width, height) {
        this.depthTexture.resize({ width, height });
        this.projectionMatrix = this.perspective.camera.matrix(width / height, this.focalLength);
    }
    render(encoder, attachment) {
        const passDescriptor = {
            colorAttachments: [attachment],
            depthStencilAttachment: this.depthTexture.createView().depthAttachment(0)
        };
        encoder.renderPass(passDescriptor, pass => {
            if (this.renderer !== null) {
                pass.setBindGroup(0, this.uniformsGroup);
                this.renderer.render(pass);
            }
        });
    }
}
//# sourceMappingURL=normals.gpu.js.map