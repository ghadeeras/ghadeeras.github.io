import * as gpu from "../djee/gpu/index.js"
import { uniformsStruct } from "./tracer.js"

export class Stacker {

    private readonly device: gpu.Device
    private readonly maxLayersCount: number

    private readonly pipeline: GPURenderPipeline
    private readonly groupLayout: GPUBindGroupLayout

    private readonly texture: gpu.Texture
    private readonly sampler: gpu.Sampler

    readonly frameViews: gpu.Buffer

    private _group: GPUBindGroup
    private _layersCount: number

    private _layer: number

    constructor(shaderModule: gpu.ShaderModule, readonly size: GPUExtent3DDictStrict, readonly uniforms: gpu.Buffer, readonly normalsTexture: gpu.Texture, readonly inputFormat: GPUTextureFormat, readonly outputFormat: GPUTextureFormat) {
        this.device = shaderModule.device
        this.maxLayersCount = size.depthOrArrayLayers ?? this.device.device.limits.maxTextureArrayLayers

        this.texture = this.device.texture({
            format: inputFormat,
            size: { 
                ...size, 
                depthOrArrayLayers: this.maxLayersCount 
            },
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        })
        this.sampler = this.device.sampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
        })

        this.frameViews =  this.device.buffer("frameViews", GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, uniformsStruct.paddedSize * 256, uniformsStruct.paddedSize)

        this.groupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "read-only-storage",
                    minBindingSize: uniformsStruct.paddedSize * 256,
                }
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d-array"
                }
            }, {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "unfilterable-float",
                    viewDimension: "2d"
                }
            }, {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: "filtering"
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

        this._layersCount = this.maxLayersCount
        this._group = this.newGroup(this.maxLayersCount)

        this._layer = this.layersCount - 1
    }

    private newGroup(layersCount: number): GPUBindGroup {
        return this.device.bindGroup(
            this.groupLayout, 
            [
                this.frameViews,
                this.texture.createView({
                    dimension: "2d-array",
                    baseArrayLayer: 0,
                    arrayLayerCount: layersCount
                }),
                this.normalsTexture.createView(),
                this.sampler
            ]
        )
    }

    get layer() {
        return this._layer
    }

    get layersCount() {
        return this._layersCount
    }

    set layersCount(count: number) {
        const c = Math.min(Math.max(count, 1), this.maxLayersCount)
        this._layersCount = c
        this._group = this.newGroup(c)
        this._layer %= c
    }

    colorAttachment(clearColor: GPUColor, colorAttachment: GPURenderPassColorAttachment | null = null) {
        this._layer = (this._layer + 1) % this.layersCount
        this.frameViews.copyAt(uniformsStruct.paddedSize * this.layer, this.uniforms, 0, uniformsStruct.paddedSize)
        return this.layersCount < 2 && colorAttachment !== null
            ? colorAttachment
            : this.texture.createView({
                dimension: "2d",
                baseArrayLayer: this._layer,
                arrayLayerCount: 1
            }).colorAttachment(clearColor)
    }

    render(encoder: gpu.CommandEncoder, colorAttachment: GPURenderPassColorAttachment) {
        encoder.renderPass({ colorAttachments: [ colorAttachment ] }, pass => {
            pass.setBindGroup(0, this._group)
            pass.setPipeline(this.pipeline)
            pass.draw(4, 1, 0, this._layer)
        })
    }

    static async create(device: gpu.Device, size: GPUExtent3DDictStrict, uniforms: gpu.Buffer, normalsTexture: gpu.Texture, inputFormat: GPUTextureFormat, outputFormat: GPUTextureFormat): Promise<Stacker> {
        return new Stacker(await device.loadShaderModule("stacker.wgsl"), size, uniforms, normalsTexture, inputFormat, outputFormat)
    }

}