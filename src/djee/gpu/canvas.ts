import { required } from "../utils.js"
import { Device } from "./device.js"
import { Texture } from "./texture.js"

export class Canvas {

    readonly element: HTMLCanvasElement
    readonly context: GPUCanvasContext
    readonly colorTexture: Texture | null 
    readonly size: Readonly<GPUExtent3DDict>
    readonly sampleCount: number
    readonly configs: Readonly<GPUCanvasConfiguration>

    constructor(readonly device: Device, canvas: HTMLCanvasElement | string, withMultiSampling = true, configs: Partial<GPUCanvasConfiguration> = {}) {
        this.element = typeof canvas === 'string' ? 
            required(document.getElementById(canvas)) as HTMLCanvasElement : 
            canvas
        this.context = required(this.element.getContext("webgpu"))

        const pixelRatio = withMultiSampling ? window.devicePixelRatio : 1
        this.sampleCount = Math.ceil(pixelRatio) ** 2
        this.size = {
            width: this.element.width,
            height: this.element.height,
        }

        this.configs = {
            device: device.device,
            format: configs.format ?? navigator.gpu.getPreferredCanvasFormat(),
            usage: configs.usage ?? GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: configs.alphaMode ?? "opaque",
            colorSpace: configs.colorSpace ?? "srgb",
            viewFormats: configs.viewFormats ?? [],
        }
        this.context.configure(this.configs)

        this.colorTexture = this.sampleCount !== 1 ? device.texture({
            format: this.configs.format,
            usage: (this.configs.usage ?? 0) | GPUTextureUsage.RENDER_ATTACHMENT,
            viewFormats: this.configs.viewFormats,
            size: this.size,
            sampleCount: this.sampleCount,
            dimension: "2d",
            mipLevelCount: 1,
            label: `${this.element.id ?? "canvas"}-multi-sample-texture`
        }) : null
    }

    get format(): GPUTextureFormat {
        return this.configs.format
    }

    attachment(clearColor: GPUColor): GPURenderPassColorAttachment {
        return this.colorTexture 
            ? {
                view: this.colorTexture.createView().view,
                resolveTarget: this.context.getCurrentTexture().createView(),
                storeOp: "discard",
                loadOp: "clear",
                clearValue: clearColor,
            } 
            : {
                view: this.context.getCurrentTexture().createView(),
                storeOp: "store",
                loadOp: "clear",
                clearValue: clearColor,
            } 
    }

    depthTexture(descriptor: Partial<GPUTextureDescriptor> = {}): Texture {
        return this.device.texture({
            size: this.size,
            sampleCount: this.sampleCount,
            format: descriptor.format ?? "depth32float",
            usage: descriptor.usage ?? GPUTextureUsage.RENDER_ATTACHMENT,
            label: descriptor.label ?? `${this.element.id ?? "canvas"}-depth-texture`
        })
    }

    multiSampleState(): GPUMultisampleState | undefined {
        return this.colorTexture 
            ? { count: this.sampleCount } 
            : undefined
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