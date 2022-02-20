import { Device } from "./device.js"
import { formatOf } from "./utils.js"

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

    depthState(state: Partial<GPUDepthStencilState> = {
        depthCompare: "less",
        depthWriteEnabled: true,
    }): GPUDepthStencilState {
        return {
            ...state,
            format: formatOf(this.descriptor.format)
        }
    }

    depthAttachment(clearValue: number | undefined = 1): GPURenderPassDepthStencilAttachment {
        return {
            view: this.view,
            depthStoreOp: clearValue === undefined || this.isCopySrc ? "store" : "discard",
            depthLoadOp: clearValue === undefined ? "load" : "clear",
            depthClearValue: clearValue,
            stencilReadOnly: true,
        }
    }

    colorAttachment(clearValue: GPUColor | undefined = undefined): GPURenderPassColorAttachment {
        return {
            view: this.view,
            storeOp: clearValue === undefined || this.isCopySrc ? "store" : "discard",
            loadOp: clearValue === undefined ? "load" : "clear",
            clearValue: clearValue,
        }
    }

    createView(): GPUTextureView {
        return this.texture.createView()
    }

    get isCopySrc(): boolean {
        return (this.descriptor.usage & GPUTextureUsage.COPY_SRC) !== 0
    }
    
}