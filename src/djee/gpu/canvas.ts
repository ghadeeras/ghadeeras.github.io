import { required } from "../../utils/misc.js"
import { Device } from "./device.js"
import { Texture } from "./texture.js"

export class Canvas {

    readonly element: HTMLCanvasElement
    readonly context: GPUCanvasContext
    readonly colorTexture: Texture
    readonly size: GPUExtent3DDict
    readonly sampleCount: number
    readonly format: GPUTextureFormat

    constructor(readonly device: Device, canvas: HTMLCanvasElement | string) {
        this.element = typeof canvas === 'string' ? 
            required(document.getElementById(canvas)) as HTMLCanvasElement : 
            canvas
        this.context = required(this.element.getContext("webgpu") ?? this.element.getContext("gpupresent"))

        const pixelRatio = window.devicePixelRatio
        this.sampleCount = Math.ceil(pixelRatio) ** 2
        this.size = {
            width: Math.round(this.element.clientWidth * pixelRatio),
            height: Math.round(this.element.clientHeight * pixelRatio),
        }

        this.format = this.context.getPreferredFormat(device.adapter)
        this.context.configure({
            size: this.size,
            format: this.format,
            device: device.device,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            compositingAlphaMode: "opaque",
        })
        this.colorTexture = device.texture({
            size: this.size,
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount,
        })
    }

    attachment(clearColor: GPUColor): GPURenderPassColorAttachment {
        return {
            view: this.colorTexture.createView(),
            resolveTarget: this.context.getCurrentTexture().createView(),
            storeOp: "discard",
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

    destroy() {
        this.colorTexture.destroy()
        this.context.unconfigure()
    }

}