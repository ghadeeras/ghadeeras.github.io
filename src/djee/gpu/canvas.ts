import { required } from "../../utils/misc.js"
import { Device } from "./device.js"
import { Texture } from "./texture.js"

export class Canvas {

    readonly element: HTMLCanvasElement
    readonly context: GPUCanvasContext
    readonly colorTexture: Texture | null 
    readonly size: GPUExtent3DDict
    readonly sampleCount: number
    readonly format: GPUTextureFormat

    constructor(readonly device: Device, canvas: HTMLCanvasElement | string, withMultiSampling: boolean = true) {
        this.element = typeof canvas === 'string' ? 
            required(document.getElementById(canvas)) as HTMLCanvasElement : 
            canvas
        this.context = required(this.element.getContext("webgpu"))

        const pixelRatio = withMultiSampling ? window.devicePixelRatio : 1
        this.sampleCount = Math.ceil(pixelRatio) ** 2
        this.size = {
            width: Math.round(this.element.width * pixelRatio),
            height: Math.round(this.element.height * pixelRatio),
        }

        this.format = this.context.getPreferredFormat(device.adapter)
        this.context.configure({
            size: this.size,
            format: this.format,
            device: device.device,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            compositingAlphaMode: "opaque",
        })
        this.colorTexture = this.sampleCount !== 1 ? device.texture({
            size: this.size,
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount,
        }) : null
    }

    attachment(clearColor: GPUColor): GPURenderPassColorAttachment {
        return this.colorTexture ? {
            view: this.colorTexture.createView().view,
            resolveTarget: this.context.getCurrentTexture().createView(),
            storeOp: "discard",
            loadOp: "clear",
            clearValue: clearColor,
        } : {
            view: this.context.getCurrentTexture().createView(),
            storeOp: "store",
            loadOp: "clear",
            clearValue: clearColor,
        } 
    }

    depthTexture(): Texture {
        return this.device.texture({
            size: this.size,
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount
        })
    }

    multiSampleState(): GPUMultisampleState | undefined {
        return this.colorTexture ? {
            count: this.sampleCount
        } : undefined
    }

    fragmentCount(): number {
        return this.size.width * (this.size.height ?? 1) * this.sampleCount
    }

    destroy() {
        if (this.colorTexture) {
            this.colorTexture.destroy()
        }
        this.context.unconfigure()
    }

}