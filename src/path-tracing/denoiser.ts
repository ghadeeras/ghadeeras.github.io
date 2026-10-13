import { gpu } from "lumen"
import { GPUToy, DenoiserGroupLayout } from "./toy.gpu.js"

export class Denoiser {

    private readonly device: gpu.Device
    private readonly pipeline: GPURenderPipeline

    readonly colorsTexture: gpu.Texture
    readonly normalsTexture: gpu.Texture

    private _group: gpu.CompatibleBindGroup<DenoiserGroupLayout>

    constructor(gpuToy: GPUToy, readonly size: GPUExtent3DDictStrict, readonly inputColorsFormat: GPUTextureFormat, readonly inputNormalsFormat: GPUTextureFormat, readonly outputFormat: GPUTextureFormat) {
        this.device = gpuToy.device

        this.colorsTexture = this.device.texture({
            format: inputColorsFormat,
            size: size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        })
        this.normalsTexture = this.device.texture({
            format: inputNormalsFormat,
            size: size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        })

        this.pipeline =  this.device.wrapped.createRenderPipeline({
            vertex: gpuToy.shaders.denoiser.vertexState("v_main", []),
            fragment: gpuToy.shaders.denoiser.fragmentState("f_main", [
                outputFormat
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            },
            layout: gpuToy.pipelineLayouts.denoiser.wrapped
        })

        this._group = gpuToy.groupLayouts.denoiser.bindGroup({
            colors: this.colorsTexture.createView(),
            normals: this.normalsTexture.createView(),
        })
    }

    attachments(clearColor: GPUColor, clearNormal: GPUColor) {
        return [
            this.colorsTexture.createView().colorAttachment(clearColor),
            this.normalsTexture.createView().colorAttachment(clearNormal),
        ]
    }

    render(encoder: gpu.CommandEncoder, colorAttachment: GPURenderPassColorAttachment) {
        encoder.renderPass({ colorAttachments: [ colorAttachment ] }, pass => {
            pass.setBindGroup(0, this._group.wrapped)
            pass.setPipeline(this.pipeline)
            pass.draw(4)
        })
    }

}