import { Device } from "./device.js"
import { formatOf } from "./utils.js"

export class Texture {

    readonly texture: GPUTexture
    readonly size: GPUExtent3DDictStrict

    constructor(readonly device: Device, readonly descriptor: GPUTextureDescriptor) {
        this.texture = this.device.device.createTexture(descriptor)
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

    createView(descriptor: GPUTextureViewDescriptor | undefined = undefined): TextureView {
        return new TextureView(this, descriptor)
    }

    get isCopySrc(): boolean {
        return (this.descriptor.usage & GPUTextureUsage.COPY_SRC) !== 0
    }
    
    get isTextureBinding(): boolean {
        return (this.descriptor.usage & GPUTextureUsage.TEXTURE_BINDING) !== 0
    }

    get isSource(): boolean {
        return this.isCopySrc || this.isTextureBinding
    }

    asColorTargetState(state: Partial<GPUColorTargetState> = {}): GPUColorTargetState {
        return {
            ...state,
            format: this.descriptor.format
        }
    }
    
}

export class TextureView {

    readonly view: GPUTextureView
    
    constructor(readonly texture: Texture, descriptor: GPUTextureViewDescriptor | undefined = undefined) {
        this.view = texture.texture.createView(descriptor)
    }

    colorAttachment(clearValue: GPUColor | undefined = undefined): GPURenderPassColorAttachment {
        return {
            view: this.view,
            storeOp: clearValue === undefined || this.texture.isSource ? "store" : "discard",
            loadOp: clearValue === undefined ? "load" : "clear",
            clearValue: clearValue,
        }
    }

    depthAttachment(clearValue: number | undefined = 1): GPURenderPassDepthStencilAttachment {
        return {
            view: this.view,
            depthStoreOp: clearValue === undefined || this.texture.isSource ? "store" : "discard",
            depthLoadOp: clearValue === undefined ? "load" : "clear",
            depthClearValue: clearValue,
            stencilReadOnly: true,
        }
    }

    asBindingResource(): GPUBindingResource {
        return this.view
    }
    
}

export class Sampler {

    readonly sampler: GPUSampler

    constructor(readonly device: Device, readonly descriptor: GPUSamplerDescriptor | undefined = undefined) {
        this.sampler = this.device.device.createSampler(descriptor)
    }
   
    asBindingResource(): GPUBindingResource {
        return this.sampler
    }
    
}