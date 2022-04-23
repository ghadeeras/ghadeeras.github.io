import * as gpu from "../djee/gpu/index.js"

export class Integrator {

    private readonly device: gpu.Device

    private readonly pipeline: GPURenderPipeline
    private readonly groupLayout: GPUBindGroupLayout

    private readonly texture: gpu.Texture
    private readonly sampler: gpu.Sampler

    private _group: GPUBindGroup
    private _layersCount: number

    private layer: number

    constructor(shaderModule: gpu.ShaderModule, private canvas: gpu.Canvas, private maxLayersCount: number) {
        this.device = shaderModule.device

        this.texture = this.device.texture({
            format: canvas.format,
            size: {
                width: canvas.size.width,
                height: canvas.size.height,
                depthOrArrayLayers: maxLayersCount,
            },
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        })
        this.sampler = this.device.sampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "nearest",
            minFilter: "nearest",
        })

        this.pipeline =  this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                this.texture
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            }
        })
        this.groupLayout = this.pipeline.getBindGroupLayout(0)

        this._layersCount = maxLayersCount
        this._group = this.newGroup(maxLayersCount)

        this.layer = this.layersCount - 1
    }

    private newGroup(layersCount: number): GPUBindGroup {
        return this.device.createBindGroup(
            this.groupLayout, 
            [
                this.texture.createView({
                    dimension: "2d-array",
                    baseArrayLayer: 0,
                    arrayLayerCount: layersCount
                }),
                this.sampler
            ]
        )
    }

    get layersCount() {
        return this._layersCount
    }

    set layersCount(count: number) {
        const c = Math.min(Math.max(count, 0), this.maxLayersCount)
        this._layersCount = c
        this._group = this.newGroup(c)
        this.layer %= c
    }

    colorAttachment(clearColor: GPUColor) {
        return this.layersCount < 2
            ? this.canvas.attachment(clearColor)
            : this.texture.createView({
                dimension: "2d",
                baseArrayLayer: this.layer,
                arrayLayerCount: 1
            }).colorAttachment(clearColor)
    }

    encode(encoder: gpu.CommandEncoder) {
        this.layer = (this.layer + 1) % this.layersCount
        if (this.layersCount > 1) {
            encoder.renderPass(
                {
                    colorAttachments: [
                        this.canvas.attachment({ r: 0, g: 0, b: 0, a: 1 })
                    ]
                },
                pass => {
                    pass.setBindGroup(0, this._group)
                    pass.setPipeline(this.pipeline)
                    pass.draw(4)
                }
            )
        }
    }

    static async create(device: gpu.Device, canvas: gpu.Canvas, maxLayersCount: number = device.device.limits.maxTextureArrayLayers): Promise<Integrator> {
        return new Integrator(await device.loadShaderModule("integrator.wgsl"), canvas, maxLayersCount)
    }

}