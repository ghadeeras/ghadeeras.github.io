var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether } from "/gen/libs.js";
import { gltf, gpu } from "../djee/index.js";
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
const projection = new aether.PerspectiveProjection(1, null, false, false);
export class GPUView {
    constructor(device, shaderModule, canvasId) {
        this.device = device;
        this.shaderModule = shaderModule;
        this.renderer = null;
        this._viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
        this._modelMatrix = aether.mat4.identity();
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
        this.nodeGroupLayout = device.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform",
                    },
                }],
        });
        this.pipelineLayout = this.device.device.createPipelineLayout({
            bindGroupLayouts: [this.uniformsGroupLayout, this.nodeGroupLayout],
        });
        this.fragmentState = this.shaderModule.fragmentState("f_main", [this.gpuCanvas]);
        this.depthState = this.depthTexture.depthState();
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
    loadModel(modelUri) {
        return __awaiter(this, void 0, void 0, function* () {
            this._modelMatrix = aether.mat4.identity();
            this._viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
            const modelView = aether.mat4.mul(this._viewMatrix, this._modelMatrix);
            this.uniforms.set(uniformsStruct.members.mat, { positions: modelView, normals: modelView });
            this.projectionMatrix = projection.matrix(2, this.aspectRatio);
            const model = yield gltf.graph.Model.create(modelUri);
            if (this.renderer !== null) {
                this.renderer.destroy();
                this.renderer = null;
            }
            this.renderer = new gpu.GPURenderer(model, this.device, 1, { POSITION: 0, NORMAL: 1 }, (buffer, offset) => this.nodeBindGroup(buffer, offset), (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState));
        });
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
    resize() {
        this.gpuCanvas.resize();
        this.depthTexture.resize(this.gpuCanvas.size);
        this.projectionMatrix = projection.matrix(this.focalLength, this.aspectRatio);
    }
    draw() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                if (this.renderer !== null) {
                    pass.setBindGroup(0, this.uniformsGroup);
                    this.renderer.render(pass);
                }
            });
        });
    }
}
export function newViewFactory(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpu.Device.instance();
        const shaderModule = yield device.loadShaderModule("gltf.wgsl");
        return () => new GPUView(device, shaderModule, canvasId);
    });
}
//# sourceMappingURL=view.gpu.js.map