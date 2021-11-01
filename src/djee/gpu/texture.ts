import { Device } from "./device.js"

export class Texture {

    readonly texture: GPUTexture
    readonly view: GPUTextureView

    constructor(readonly device: Device, readonly descriptor: GPUTextureDescriptor) {
        this.texture = this.device.device.createTexture(descriptor)
        this.view = this.texture.createView()
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

    createView(): GPUTextureView {
        return this.texture.createView()
    }

    get isCopySrc(): boolean {
        return (this.descriptor.usage & GPUTextureUsage.COPY_SRC) !== 0
    }
    
}