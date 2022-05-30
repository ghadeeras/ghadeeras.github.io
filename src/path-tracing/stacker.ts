import * as gpu from "../djee/gpu/index.js"

export class Stacker {

    private readonly device: gpu.Device
    private readonly maxLayersCount: number

    private readonly pipeline: GPURenderPipeline
    private readonly groupLayout: GPUBindGroupLayout

    private readonly texture: gpu.Texture
    private readonly sampler: gpu.Sampler

    private _group: GPUBindGroup
    private _layersCount: number

    private layer: number

    constructor(shaderModule: gpu.ShaderModule, readonly size: GPUExtent3DDictStrict, readonly format: GPUTextureFormat) {
        this.device = shaderModule.device
        this.maxLayersCount = size.depthOrArrayLayers ?? this.device.device.limits.maxTextureArrayLayers

        this.texture = this.device.texture({
            format: format,
            size: { 
                ...size, 
                depthOrArrayLayers: this.maxLayersCount 
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

        this._layersCount = this.maxLayersCount
        this._group = this.newGroup(this.maxLayersCount)

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
        const c = Math.min(Math.max(count, 1), this.maxLayersCount)
        this._layersCount = c
        this._group = this.newGroup(c)
        this.layer %= c
    }

    colorAttachment(clearColor: GPUColor, colorAttachment: GPURenderPassColorAttachment | null = null) {
        this.layer = (this.layer + 1) % this.layersCount
        return this.layersCount < 2 && colorAttachment !== null
            ? colorAttachment
            : this.texture.createView({
                dimension: "2d",
                baseArrayLayer: this.layer,
                arrayLayerCount: 1
            }).colorAttachment(clearColor)
    }

    render(encoder: gpu.CommandEncoder, colorAttachment: GPURenderPassColorAttachment) {
        if (this.layersCount > 1) {
            encoder.renderPass({ colorAttachments: [ colorAttachment ] }, pass => {
                pass.setBindGroup(0, this._group)
                pass.setPipeline(this.pipeline)
                pass.draw(4)
            })
        }
    }

    static async create(device: gpu.Device, size: GPUExtent3DDictStrict, format: GPUTextureFormat): Promise<Stacker> {
        return new Stacker(await device.loadShaderModule("stacker.wgsl"), size, format)
    }

}