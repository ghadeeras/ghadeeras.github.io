import { Device } from "./device.js"

export class Texture {

    readonly texture: GPUTexture
    readonly view: GPUTextureView
    readonly size: GPUExtent3DDictStrict

    constructor(readonly device: Device, readonly descriptor: GPUTextureDescriptor) {
        this.texture = this.device.device.createTexture(descriptor)
        this.view = this.texture.createView()
        if ('width' in descriptor.size) {
            this.size = descriptor.size
        } else {
            const [width, height] = descriptor.size
            this.size = { width, height }
        }
    }

    destroy() {
        this.texture.destroy()
    }

    depthAttachment(loadValue: number | "load" = 1): GPURenderPassDepthStencilAttachment {
        return {
            view: this.view,
            depthLoadValue: loadValue,
            depthStoreOp: loadValue == "load" || this.isCopySrc ? "store" : "discard",
            stencilStoreOp: "discard",
            stencilLoadValue: 0,
        }
    }

    colorAttachment(loadValue: GPUColor | "load" = "load"): GPURenderPassColorAttachment {
        return {
            view: this.view,
            loadValue: loadValue,
            storeOp: loadValue == "load" || this.isCopySrc ? "store" : "discard",
        }
    }

    createView(): GPUTextureView {
        return this.texture.createView()
    }

    get isCopySrc(): boolean {
        return (this.descriptor.usage & GPUTextureUsage.COPY_SRC) !== 0
    }
    
}