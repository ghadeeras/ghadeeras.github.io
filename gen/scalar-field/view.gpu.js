var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as ether from "ether";
import * as gpu from "../djee/gpu/index.js";
import { picker } from "./picker.gpu.js";
export class GPUView {
    constructor(device, canvasId, shaderModule) {
        this.device = device;
        this.uniformsStruct = gpu.struct({
            positionsMat: gpu.mat4x4,
            normalsMat: gpu.mat4x4,
            projectionMat: gpu.mat4x4,
            color: gpu.f32.x4,
            lightPos: gpu.f32.x4,
            shininess: gpu.f32,
            lightRadius: gpu.f32,
            fogginess: gpu.f32,
        });
        this.uniformsData = new Float32Array(this.uniformsStruct.paddedSize / Float32Array.BYTES_PER_ELEMENT);
        this.uniformsView = new DataView(this.uniformsData.buffer);
        this._matPositions = ether.mat4.identity();
        this._matNormals = ether.mat4.identity();
        this._matView = ether.mat4.identity();
        this._lightPosition = [2, 2, 2, 1];
        this.uniforms = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, this.uniformsData);
        this.vertices = device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, GPUView.vertex.struct.stride, new Float32Array([]));
        this.canvas = device.canvas(canvasId);
        this.depthTexture = this.canvas.depthTexture();
        this.pipeline = device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [GPUView.vertex.asBufferLayout()]),
            fragment: shaderModule.fragmentState("f_main", [this.canvas]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: this.canvas.sampleCount
            }
        });
        this.uniformsGroup = device.createBindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms]);
        this.frame = () => {
            this.draw();
            requestAnimationFrame(this.frame);
        };
        this.frame();
    }
    get matPositions() {
        return this._matPositions;
    }
    get matNormals() {
        return this._matNormals;
    }
    get matView() {
        return this._matView;
    }
    set matView(m) {
        this._matView = m;
        this.lightPosition = this._lightPosition;
    }
    setMatModel(modelPositions, modelNormals = ether.mat4.transpose(ether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions;
        this._matNormals = modelNormals;
        const matPositions = ether.mat4.mul(this.matView, modelPositions);
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            ether.mat4.mul(this.matView, modelNormals);
        this.uniformsStruct.members.positionsMat.write(this.uniformsView, 0, matPositions);
        this.uniformsStruct.members.normalsMat.write(this.uniformsView, 0, matNormals);
        this.uniforms.writeAt(0, this.uniformsData, 0, 32);
    }
    get matProjection() {
        return this.uniformsStruct.members.projectionMat.read(this.uniformsView, 0);
    }
    set matProjection(m) {
        this.uniformsStruct.members.projectionMat.write(this.uniformsView, 0, m);
        this.uniforms.writeAt(32 * 4, this.uniformsData, 32, 16);
    }
    get color() {
        return this.uniformsStruct.members.color.read(this.uniformsView, 0);
    }
    set color(c) {
        this.uniformsStruct.members.color.write(this.uniformsView, 0, c);
        this.uniforms.writeAt(48 * 4, this.uniformsData, 48, 4);
    }
    get lightPosition() {
        return this._lightPosition;
    }
    set lightPosition(p) {
        this._lightPosition = p;
        this.uniformsStruct.members.lightPos.write(this.uniformsView, 0, ether.vec4.add(this._matView[3], p));
        this.uniforms.writeAt(52 * 4, this.uniformsData, 52, 4);
    }
    get shininess() {
        return this.uniformsStruct.members.shininess.read(this.uniformsView, 0);
    }
    set shininess(s) {
        this.uniformsStruct.members.shininess.write(this.uniformsView, 0, s);
        this.uniforms.writeAt(56 * 4, this.uniformsData, 56, 1);
    }
    get lightRadius() {
        return this.uniformsStruct.members.lightRadius.read(this.uniformsView, 0);
    }
    set lightRadius(r) {
        this.uniformsStruct.members.lightRadius.write(this.uniformsView, 0, r);
        this.uniforms.writeAt(57 * 4, this.uniformsData, 57, 1);
    }
    get fogginess() {
        return this.uniformsStruct.members.fogginess.read(this.uniformsView, 0);
    }
    set fogginess(f) {
        this.uniformsStruct.members.fogginess.write(this.uniformsView, 0, f);
        this.uniforms.writeAt(58 * 4, this.uniformsData, 58, 1);
    }
    setMesh(primitives, vertices) {
        this.vertices.setData(vertices);
    }
    picker() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield picker(this.canvas, () => this.vertices);
        });
    }
    draw() {
        this.device.enqueueCommand(encoder => {
            const passDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setVertexBuffer(0, this.vertices.buffer);
                pass.setBindGroup(0, this.uniformsGroup);
                pass.draw(this.vertices.stridesCount);
            });
        });
    }
}
GPUView.vertex = gpu.vertex({
    position: gpu.f32.x3,
    normal: gpu.f32.x3,
});
export function newView(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpu.Device.instance();
        const shaderModule = yield device.loadShaderModule("generic.wgsl");
        return new GPUView(device, canvasId, shaderModule);
    });
}
//# sourceMappingURL=view.gpu.js.map