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
import { GPUView } from "./view.gpu.js";
export class GPUPicker {
    constructor(canvas, shaderModule, vertices) {
        this.canvas = canvas;
        this.vertices = vertices;
        this.vertex = GPUView.vertex.sub(['position']);
        this.uniformsStruct = gpu.struct({
            mvpMat: gpu.mat4x4
        });
        this.device = canvas.device;
        this.uniforms = this.device.buffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.paddedSize);
        this.pickDestination = this.device.buffer("pickDestination", GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, 16);
        this.colorTexture = this.device.texture({
            format: "rgba32float",
            size: canvas.size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        this.depthTexture = this.device.texture({
            format: "depth32float",
            size: canvas.size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.pipeline = this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [this.vertex.asBufferLayout()]),
            fragment: shaderModule.fragmentState("f_main", [this.colorTexture]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: "triangle-list"
            },
            layout: "auto"
        });
        this.uniformsGroup = this.device.bindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms]);
    }
    pick(matModelViewProjection, x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            this.uniforms.writeAt(0, this.uniformsStruct.members.mvpMat.view([matModelViewProjection]));
            this.device.enqueueCommand("pick", encoder => {
                var _a;
                const passDescriptor = {
                    colorAttachments: [this.colorTexture.createView().colorAttachment({ r: 0, g: 0, b: 0, a: 0 })],
                    depthStencilAttachment: this.depthTexture.createView().depthAttachment()
                };
                encoder.renderPass(passDescriptor, pass => {
                    const vertices = this.vertices();
                    pass.setPipeline(this.pipeline);
                    pass.setVertexBuffer(0, vertices.buffer);
                    pass.setBindGroup(0, this.uniformsGroup);
                    pass.draw(vertices.stridesCount);
                });
                encoder.encoder.copyTextureToBuffer({
                    texture: this.colorTexture.texture,
                    origin: {
                        x: Math.round(this.colorTexture.size.width * (x + 1) / 2),
                        y: Math.round(((_a = this.colorTexture.size.height) !== null && _a !== void 0 ? _a : 1) * (1 - y) / 2),
                    }
                }, {
                    buffer: this.pickDestination.buffer,
                    bytesPerRow: 256,
                }, {
                    width: 1,
                    height: 1,
                });
            });
            const view = yield this.pickDestination.readAt(0, gpu.vec4(gpu.f32).view());
            return aether.vec4.sub(aether.vec4.scale(aether.vec4.from(gpu.float32Array(view)), 2), [1, 1, 1, 1]);
        });
    }
    resize() {
        this.colorTexture.resize(this.canvas.size);
        this.depthTexture.resize(this.canvas.size);
    }
}
export function picker(canvas, vertices) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaderModule = yield canvas.device.loadShaderModule("picker.wgsl");
        return new GPUPicker(canvas, shaderModule, vertices);
    });
}
//# sourceMappingURL=picker.gpu.js.map