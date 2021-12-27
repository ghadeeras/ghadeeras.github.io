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
import * as gpu from "../djee/gpu/index.js";
import { picker } from "./picker.gpu.js";
export class GPUView {
    constructor(device, canvasId, shaderModule) {
        this.device = device;
        this.uniformsStruct = gpu.struct({
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
        this.uniformsView = this.uniformsStruct.view();
        this._matPositions = aether.mat4.identity();
        this._matNormals = aether.mat4.identity();
        this._matView = aether.mat4.identity();
        this._lightPosition = [2, 2, 2, 1];
        this.uniforms = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsView);
        this.vertices = device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, GPUView.vertex.struct.stride);
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
    setMatModel(modelPositions, modelNormals = aether.mat4.transpose(aether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions;
        this._matNormals = modelNormals;
        const matPositions = aether.mat4.mul(this.matView, modelPositions);
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            aether.mat4.mul(this.matView, modelNormals);
        this.setMember(this.uniformsStruct.members.mat, {
            positions: matPositions,
            normals: matNormals
        });
    }
    get matProjection() {
        return this.getMember(this.uniformsStruct.members.projectionMat);
    }
    set matProjection(m) {
        this.setMember(this.uniformsStruct.members.projectionMat, m);
    }
    get color() {
        return this.getMember(this.uniformsStruct.members.color);
    }
    set color(c) {
        this.setMember(this.uniformsStruct.members.color, c);
    }
    get lightPosition() {
        return this._lightPosition;
    }
    set lightPosition(p) {
        this._lightPosition = p;
        this.setMember(this.uniformsStruct.members.lightPos, aether.vec4.add(this._matView[3], p));
    }
    get shininess() {
        return this.getMember(this.uniformsStruct.members.shininess);
    }
    set shininess(s) {
        this.setMember(this.uniformsStruct.members.shininess, s);
    }
    get lightRadius() {
        return this.getMember(this.uniformsStruct.members.lightRadius);
    }
    set lightRadius(r) {
        this.setMember(this.uniformsStruct.members.lightRadius, r);
    }
    get fogginess() {
        return this.getMember(this.uniformsStruct.members.fogginess);
    }
    set fogginess(f) {
        this.setMember(this.uniformsStruct.members.fogginess, f);
    }
    getMember(member) {
        return member.read(this.uniformsView);
    }
    setMember(member, value) {
        member.write(this.uniformsView, value);
        this.uniforms.syncFrom(this.uniformsView, member);
    }
    setMesh(primitives, vertices) {
        this.vertices.setData(gpu.dataView(vertices));
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