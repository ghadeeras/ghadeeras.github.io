import * as gpu from "../djee/gpu/index.js"

export class Denoiser {

    private readonly device: gpu.Device

    private readonly pipeline: GPURenderPipeline
    private readonly groupLayout: GPUBindGroupLayout

    private readonly colorsTexture: gpu.Texture
    readonly normalsTexture: gpu.Texture

    private _group: GPUBindGroup

    constructor(shaderModule: gpu.ShaderModule, readonly size: GPUExtent3DDictStrict, readonly inputColorsFormat: GPUTextureFormat, readonly inputNormalsFormat: GPUTextureFormat, readonly outputFormat: GPUTextureFormat) {
        this.device = shaderModule.device

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

        this.groupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "unfilterable-float",
                    viewDimension: "2d"
                }
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "unfilterable-float",
                    viewDimension: "2d"
                }
            }]
        })

        this.pipeline =  this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                outputFormat
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            },
            layout: this.device.device.createPipelineLayout({
                bindGroupLayouts: [this.groupLayout]
            })
        })

        this._group = this.device.bindGroup(
            this.groupLayout, 
            [
                this.colorsTexture.createView().asBindingResource(),
                this.normalsTexture.createView().asBindingResource(),
            ]
        )
    }

    attachments(clearColor: GPUColor, clearNormal: GPUColor) {
        return [
            this.colorsTexture.createView().colorAttachment(clearColor),
            this.normalsTexture.createView().colorAttachment(clearNormal),
        ]
    }

    render(encoder: gpu.CommandEncoder, colorAttachment: GPURenderPassColorAttachment) {
        encoder.renderPass({ colorAttachments: [ colorAttachment ] }, pass => {
            pass.setBindGroup(0, this._group)
            pass.setPipeline(this.pipeline)
            pass.draw(4)
        })
    }

    static async create(device: gpu.Device, size: GPUExtent3DDictStrict, inputColorsFormat: GPUTextureFormat, inputNormalsFormat: GPUTextureFormat, outputFormat: GPUTextureFormat): Promise<Denoiser> {
        return new Denoiser(await device.loadShaderModule("denoiser.wgsl"), size, inputColorsFormat, inputNormalsFormat, outputFormat)
    }

}