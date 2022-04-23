var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether, gear } from '/gen/libs.js';
import * as gpu from '../djee/gpu/index.js';
import * as geo from './geo.js';
import { Universe } from './universe.js';
export class Renderer {
    constructor(device, canvas, renderShader) {
        var _a;
        this.device = device;
        this.canvas = canvas;
        this.bodyDesc = gpu.vertex({
            massAndRadius: gpu.f32.x2
        });
        this.bodyPosition = Universe.bodyState.asVertex(['position']);
        this.bodySurfaceVertex = gpu.vertex({
            position: gpu.f32.x3
        });
        this._projectionMatrix = aether.mat4.projection(1);
        this._viewMatrix = aether.mat4.lookAt([0, 0, -24]);
        this._modelMatrix = aether.mat4.identity();
        this.uniformsStruct = gpu.struct({
            mvpMatrix: gpu.f32.x4.x4,
            mMatrix: gpu.f32.x4.x4,
            radiusScale: gpu.f32,
        });
        this.uniformsView = this.uniformsStruct.view([{
                mvpMatrix: this.mvpMatrix(),
                mMatrix: this.mMatrix(),
                radiusScale: 0.06
            }]);
        this.updateUniformsData = new gear.DeferredComputation(() => {
            this.uniformsBuffer.writeAt(0, this.uniformsView);
        });
        const mesh = geo.sphere(18, 9);
        this.meshIndexFormat = (_a = mesh.indexFormat) !== null && _a !== void 0 ? _a : "uint16";
        this.meshSize = mesh.indices.length;
        this.depthTexture = canvas.depthTexture();
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader, canvas, mesh);
        const bindGroupLayout = this.pipeline.getBindGroupLayout(0);
        /* Buffers */
        this.uniformsBuffer = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsView);
        this.meshIndicesBuffer = device.buffer(GPUBufferUsage.INDEX, gpu.dataView(new Uint16Array(mesh.indices)));
        this.meshVertexBuffer = device.buffer(GPUBufferUsage.VERTEX, gpu.dataView(new Float32Array(mesh.positions)));
        /* Bind Groups */
        this.bindGroup = this.device.createBindGroup(bindGroupLayout, [this.uniformsBuffer]);
    }
    get projectionViewMatrix() {
        return aether.mat4.mul(this.projectionMatrix, this.viewMatrix);
    }
    get projectionMatrix() {
        return this._projectionMatrix;
    }
    set projectionMatrix(m) {
        this._projectionMatrix = m;
        this.updateMvpMatrix();
    }
    get viewMatrix() {
        return this._viewMatrix;
    }
    set viewMatrix(m) {
        this._viewMatrix = m;
        this.updateMvpMatrix();
    }
    get modelMatrix() {
        return this._modelMatrix;
    }
    set modelMatrix(m) {
        this._modelMatrix = m;
        this.updateMvpMatrix();
    }
    get radiusScale() {
        return this.getMember(this.uniformsStruct.members.radiusScale);
    }
    set radiusScale(v) {
        this.setMember(this.uniformsStruct.members.radiusScale, v);
    }
    updateMvpMatrix() {
        this.setMember(this.uniformsStruct.members.mvpMatrix, this.mvpMatrix());
        this.setMember(this.uniformsStruct.members.mMatrix, this.mMatrix());
    }
    getMember(member) {
        return member.read(this.uniformsView);
    }
    setMember(member, value) {
        member.write(this.uniformsView, value);
        this.updateUniformsData.perform();
    }
    mvpMatrix() {
        return aether.mat4.mul(aether.mat4.mul(this._projectionMatrix, this._viewMatrix), this._modelMatrix);
    }
    mMatrix() {
        return this._modelMatrix;
    }
    createPipeline(shaderModule, canvas, mesh) {
        return shaderModule.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [
                this.bodyDesc.asBufferLayout('instance'),
                this.bodyPosition.asBufferLayout('instance'),
                this.bodySurfaceVertex.asBufferLayout('vertex')
            ]),
            fragment: shaderModule.fragmentState("f_main", [canvas]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: mesh.topology,
                stripIndexFormat: mesh.indexFormat,
            },
            multisample: {
                count: canvas.sampleCount
            }
        });
    }
    render(universe) {
        const descriptor = {
            colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
            depthStencilAttachment: this.depthTexture.createView().depthAttachment()
        };
        this.device.enqueueCommand(encoder => {
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, this.bindGroup);
                pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer);
                pass.setVertexBuffer(1, universe.currentState.buffer);
                pass.setVertexBuffer(2, this.meshVertexBuffer.buffer);
                pass.setIndexBuffer(this.meshIndicesBuffer.buffer, this.meshIndexFormat);
                pass.drawIndexed(this.meshSize, universe.bodiesCount, 0, 0);
            });
        });
    }
}
export function newRenderer(device, canvas) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaderModule = yield device.loadShaderModule("gravity-render.wgsl");
        return new Renderer(device, canvas, shaderModule);
    });
}
//# sourceMappingURL=renderer.js.map