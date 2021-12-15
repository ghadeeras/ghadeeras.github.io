var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from "../djee/gpu/index.js";
import * as ether from "../../ether/latest/index.js";
import { GPUView } from "./view.gpu.js";
export class GPUPicker {
    constructor(canvas, shaderModule, vertices) {
        this.vertices = vertices;
        this.vertex = GPUView.vertex.sub(['position']);
        this.uniformsStruct = gpu.struct({
            mvpMat: gpu.mat4x4
        });
        this.device = canvas.device;
        this.uniforms = this.device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.paddedSize);
        this.pickDestination = this.device.buffer(GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, 16);
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
            }
        });
        this.uniformsGroup = this.device.createBindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms]);
    }
    pick(matModelViewProjection, x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            this.uniforms.writeAt(0, new Float32Array(ether.mat4.columnMajorArray(matModelViewProjection)));
            this.device.enqueueCommand(encoder => {
                var _a;
                const passDescriptor = {
                    colorAttachments: [this.colorTexture.colorAttachment({ r: 0, g: 0, b: 0, a: 0 })],
                    depthStencilAttachment: this.depthTexture.depthAttachment()
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
                        y: Math.round(((_a = this.colorTexture.size.height) !== null && _a !== void 0 ? _a : 1) * (1 - y) / 2)
                    }
                }, {
                    buffer: this.pickDestination.buffer,
                }, {
                    width: 1,
                    height: 1
                });
            });
            const array = yield this.pickDestination.readAt(0, new Float32Array(4));
            return ether.vec4.sub(ether.vec4.scale(ether.vec4.from(array), 2), [1, 1, 1, 1]);
        });
    }
}
export function picker(canvas, vertices) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaderModule = yield canvas.device.loadShaderModule("picker.wgsl");
        return new GPUPicker(canvas, shaderModule, vertices);
    });
}
//# sourceMappingURL=picker.gpu.js.map