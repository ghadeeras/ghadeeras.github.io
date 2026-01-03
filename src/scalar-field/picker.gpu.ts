import * as aether from "aether"
import * as gear from "gear"
import { gpu } from "lumen"
import { Picker } from "./view.js"
import { GPUView } from "./view.gpu.js"

export class GPUPicker implements Picker {

    private device: gpu.Device
    private colorTexture: gpu.Texture
    private depthTexture: gpu.Texture
    private uniforms: gpu.Buffer
    private pickDestination: gpu.Buffer
    private pipeline: GPURenderPipeline
    private uniformsGroup: GPUBindGroup

    private vertex = GPUView.vertex.sub(['position'])

    private uniformsStruct = gpu.struct({
        mvpMat: gpu.mat4x4
    })

    constructor(
        readonly canvas: gpu.Canvas,
        shaderModule: gpu.ShaderModule,
        private vertices: () => gpu.Buffer,
    ) {
        this.device = canvas.device
        this.uniforms = this.device.buffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.paddedSize);
        this.pickDestination = this.device.buffer("pickDestination", GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, 16)

        this.colorTexture = this.device.texture({
            format: "rgba32float",
            size: canvas.size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        })
        this.depthTexture = this.device.texture({
            format: "depth32float",
            size: canvas.size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        })

        this.pipeline = this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [this.vertex.asBufferLayout()]),
            fragment: shaderModule.fragmentState("f_main", [this.colorTexture]),
            depthStencil : this.depthTexture.depthState(),
            primitive: {
                topology: "triangle-list"
            },
            layout: "auto"
        })

        this.uniformsGroup = this.device.wrapped.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0), 
            entries: [{
                binding: 0,
                resource: this.uniforms.asBindingResource()
            }]
        });
    }

    async pick(matModelViewProjection: aether.Mat<4>, x: number, y: number): Promise<aether.Vec4> {
        this.uniforms.writeAt(0, this.uniformsStruct.members.mvpMat.view([matModelViewProjection]))

        this.device.enqueueCommand("pick", encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.colorTexture.createView().colorAttachment({ r: 0, g: 0, b: 0, a: 0 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                const vertices = this.vertices()
                pass.setPipeline(this.pipeline)
                pass.setVertexBuffer(0, vertices.buffer)
                pass.setBindGroup(0, this.uniformsGroup)
                pass.draw(vertices.stridesCount)
            })
            encoder.encoder.copyTextureToBuffer(
                {
                    texture: this.colorTexture.texture,
                    origin : { 
                        x: Math.round(this.colorTexture.size.width * (x + 1) / 2), 
                        y: Math.round((this.colorTexture.size.height ?? 1) * (1 - y) / 2),
                    }
                }, {
                    buffer: this.pickDestination.buffer,
                    bytesPerRow: 256,
                }, {
                    width: 1,
                    height: 1,
                }
            )
        })

        const view = await this.pickDestination.readAt(0, gpu.vec4(gpu.f32).view())
        return aether.vec4.sub(aether.vec4.scale(aether.vec4.from(gpu.float32Array(view)), 2), [1, 1, 1, 1])
    }

    resize(): void {
        this.colorTexture.resize(this.canvas.size)
        this.depthTexture.resize(this.canvas.size)
    }

}

export async function picker(canvas: gpu.Canvas, vertices: () => gpu.Buffer): Promise<Picker> {
    const shaderModule = await canvas.device.loadShaderModule("picker.wgsl")
    return new GPUPicker(canvas, shaderModule, vertices)
}
