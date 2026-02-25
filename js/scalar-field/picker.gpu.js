import * as aether from "aether";
import { gpu } from "lumen";
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
        this.uniforms = this.device.dataBuffer({
            label: "uniforms",
            usage: ["UNIFORM"],
            size: this.uniformsStruct.paddedSize
        });
        this.pickDestination = this.device.readBuffer(16, "pickDestination");
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
        this.pipeline = this.device.wrapped.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [this.vertex.asBufferLayout()]),
            fragment: shaderModule.fragmentState("f_main", [this.colorTexture]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: "triangle-list"
            },
            layout: "auto"
        });
        this.uniformsGroup = this.device.wrapped.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                    binding: 0,
                    resource: this.uniforms.asBindingResource()
                }]
        });
    }
    async pick(matModelViewProjection, x, y) {
        this.uniforms.set().fromData(this.uniformsStruct.members.mvpMat.view([matModelViewProjection]));
        this.device.enqueueCommands("pick", encoder => {
            const passDescriptor = {
                colorAttachments: [this.colorTexture.createView().colorAttachment({ r: 0, g: 0, b: 0, a: 0 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                const vertices = this.vertices();
                pass.setPipeline(this.pipeline);
                pass.setVertexBuffer(0, vertices.wrapped);
                pass.setBindGroup(0, this.uniformsGroup);
                pass.draw(vertices.size / GPUView.vertex.struct.stride);
            });
            encoder.wrapped.copyTextureToBuffer({
                texture: this.colorTexture.wrapped,
                origin: {
                    x: Math.round(this.colorTexture.size.width * (x + 1) / 2),
                    y: Math.round((this.colorTexture.size.height ?? 1) * (1 - y) / 2),
                }
            }, {
                buffer: this.pickDestination.wrapped,
                bytesPerRow: 256,
            }, {
                width: 1,
                height: 1,
            });
        });
        const view = await this.pickDestination.get(gpu.f32.x4).asData();
        return aether.vec4.sub(aether.vec4.scale(aether.vec4.from(gpu.float32Array(view)), 2), [1, 1, 1, 1]);
    }
    resize() {
        this.depthTexture.size = this.colorTexture.size = this.canvas.size;
    }
}
export async function picker(canvas, vertices) {
    const shaderModule = await canvas.device.shaderModule({ path: "shaders/picker.wgsl" });
    return new GPUPicker(canvas, shaderModule, vertices);
}
//# sourceMappingURL=picker.gpu.js.map