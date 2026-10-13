import { gpu } from "lumen"
import { GPUToy, StackerGroupLayout, uniformsStruct } from "./toy.gpu.js"

export class Stacker {

    private readonly device: gpu.Device
    private readonly maxLayersCount: number

    private readonly pipeline: GPURenderPipeline
    private readonly groupLayout: StackerGroupLayout

    private readonly texture: gpu.Texture
    private readonly sampler: gpu.Sampler

    readonly frameViews: gpu.DataBuffer

    private _group: gpu.CompatibleBindGroup<StackerGroupLayout>
    private _layersCount: number

    private _layer: number

    constructor(gpuToy: GPUToy, readonly size: GPUExtent3DDictStrict, readonly uniforms: gpu.DataBuffer, readonly normalsTexture: gpu.Texture, readonly inputFormat: GPUTextureFormat, readonly outputFormat: GPUTextureFormat) {
        this.device = gpuToy.device
        this.maxLayersCount = size.depthOrArrayLayers ?? this.device.wrapped.limits.maxTextureArrayLayers

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

        this.frameViews =  this.device.dataBuffer({
            label: "frameViews",
            usage: ["STORAGE"], 
            size: uniformsStruct.paddedSize * 256
        })

        this.groupLayout = gpuToy.groupLayouts.stacker

        this.pipeline =  this.device.wrapped.createRenderPipeline({
            vertex: gpuToy.shaders.stacker.vertexState("v_main", []),
            fragment: gpuToy.shaders.stacker.fragmentState("f_main", [
                outputFormat
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            },
            layout: gpuToy.pipelineLayouts.stacker.wrapped
        })

        this._layersCount = this.maxLayersCount
        this._group = this.newGroup(this.maxLayersCount)

        this._layer = this.layersCount - 1
    }

    private newGroup(layersCount: number) {
        return this.groupLayout.bindGroup({
            frameViews: this.frameViews,
            stack: this.texture.createView({
                dimension: "2d-array",
                baseArrayLayer: 0,
                arrayLayerCount: layersCount
            }),
            normals: this.normalsTexture.createView(),
            sampler: this.sampler
        })
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
        this.frameViews.copy(uniformsStruct.segment(this.layer)).from(this.uniforms, 0)
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
            pass.setBindGroup(0, this._group.wrapped)
            pass.setPipeline(this.pipeline)
            pass.draw(4, 1, 0, this._layer)
        })
    }

}