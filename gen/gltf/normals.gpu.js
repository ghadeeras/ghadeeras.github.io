var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether, gear } from "/gen/libs.js";
import { gltf, gpu } from "../djee/index.js";
const uniformsStruct = gpu.struct({
    mat: gpu.struct({
        positions: gpu.mat4x4,
        normals: gpu.mat4x4,
    }),
    projectionMat: gpu.mat4x4,
});
const projection = new aether.PerspectiveProjection(1, null, false, false);
export class NormalsRenderer {
    constructor(shaderModule, depthTexture, inputs) {
        this.shaderModule = shaderModule;
        this.depthTexture = depthTexture;
        this.renderer = null;
        this._viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
        this._modelMatrix = aether.mat4.identity();
        this.statusUpdater = () => { };
        this.status = new gear.Value(consumer => this.statusUpdater = consumer);
        this.device = shaderModule.device;
        this.uniforms = this.device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, uniformsStruct.paddedSize);
        const uniformsGroupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform",
                    },
                }],
        });
        this.uniformsGroup = this.device.bindGroup(uniformsGroupLayout, [this.uniforms]);
        this.nodeGroupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform",
                    },
                }],
        });
        this.pipelineLayout = this.device.device.createPipelineLayout({
            bindGroupLayouts: [uniformsGroupLayout, this.nodeGroupLayout]
        });
        this.fragmentState = this.shaderModule.fragmentState("f_main", ["rgba32float"]),
            this.depthState = this.depthTexture.depthState(),
            gear.Value.from(inputs.matModel.map(m => aether.mat4.mul(this._viewMatrix, this._modelMatrix = m)), inputs.matView.map(m => aether.mat4.mul(this._viewMatrix = m, this._modelMatrix))).map(m => ({
                positions: m,
                normals: m,
            })).attach(this.setter(uniformsStruct.members.mat));
        inputs.modelUri.attach((modelUri) => this.loadModel(modelUri));
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
    get modelMatrix() {
        return this._modelMatrix;
    }
    loadModel(modelUri) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.statusUpdater("Loading model ...");
                const model = yield gltf.graph.Model.create(modelUri);
                this.statusUpdater("Parsing model ...");
                if (this.renderer !== null) {
                    this.renderer.destroy();
                    this.renderer = null;
                }
                this.renderer = new gpu.GPURenderer(model, this.device, 1, { POSITION: 0, NORMAL: 1 }, (buffer, offset) => this.nodeBindGroup(buffer, offset), (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState));
                this.statusUpdater("Rendering model ...");
            }
            catch (e) {
                this.statusUpdater(`Error: ${e}`);
                console.error(e);
            }
        });
    }
    primitivePipeline(vertexLayouts, primitiveState) {
        const attributesCount = vertexLayouts.map(layout => [...layout.attributes].length).reduce((l1, l2) => l1 + l2, 0);
        return this.device.device.createRenderPipeline({
            layout: this.pipelineLayout,
            fragment: this.fragmentState,
            depthStencil: this.depthState,
            vertex: this.shaderModule.vertexState("v_main", vertexLayouts),
            primitive: primitiveState,
        });
    }
    nodeBindGroup(buffer, offset) {
        return this.device.device.createBindGroup({
            layout: this.nodeGroupLayout,
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: buffer.buffer,
                        offset,
                        size: uniformsStruct.members.mat.paddedSize
                    }
                }]
        });
    }
    setter(member) {
        return (value) => this.uniforms.set(member, value);
    }
    resize(width, height) {
        this.depthTexture.resize({ width, height });
        this.projectionMatrix = projection.matrix(2, width / height);
    }
    render(encoder, attachment) {
        const passDescriptor = {
            colorAttachments: [attachment],
            depthStencilAttachment: this.depthTexture.createView().depthAttachment()
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