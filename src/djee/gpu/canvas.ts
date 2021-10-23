import { required } from "../../utils/misc.js"

export class Canvas {

    readonly element: HTMLCanvasElement
    readonly context: GPUCanvasContext
    readonly colorView: GPUTexture
    readonly size: GPUExtent3D
    readonly sampleCount: number
    readonly format: GPUTextureFormat

    constructor(canvas: HTMLCanvasElement | string,  private device: GPUDevice, adapter: GPUAdapter) {
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

        this.format = this.context.getPreferredFormat(adapter)
        this.context.configure({
            size: this.size,
            format: this.format,
            device: device,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
        this.colorView = device.createTexture({
            size: this.size,
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount,
        })
    }

    attachment(clearColor: GPUColor): GPURenderPassColorAttachment {
        return {
            view: this.colorView.createView(),
            resolveTarget: this.context.getCurrentTexture().createView(),
            loadValue: clearColor,
            storeOp: "discard",
        }
    }

    depthTexture(): GPUTexture {
        return this.device.createTexture({
            size: this.size,
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount
        })
    }

    destroy() {
        this.colorView.destroy()
        this.context.unconfigure()
    }

}