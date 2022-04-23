import { formatOf } from "./utils.js";
export class Texture {
    constructor(device, descriptor) {
        this.device = device;
        this.descriptor = descriptor;
        this.texture = this.device.device.createTexture(descriptor);
        if ('width' in descriptor.size) {
            this.size = descriptor.size;
        }
        else {
            const [width, height] = descriptor.size;
            this.size = { width, height };
        }
    }
    destroy() {
        this.texture.destroy();
    }
    depthState(state = {
        depthCompare: "less",
        depthWriteEnabled: true,
    }) {
        return Object.assign(Object.assign({}, state), { format: formatOf(this.descriptor.format) });
    }
    createView(descriptor = undefined) {
        return new TextureView(this, descriptor);
    }
    get isCopySrc() {
        return (this.descriptor.usage & GPUTextureUsage.COPY_SRC) !== 0;
    }
    get isTextureBinding() {
        return (this.descriptor.usage & GPUTextureUsage.TEXTURE_BINDING) !== 0;
    }
    get isSource() {
        return this.isCopySrc || this.isTextureBinding;
    }
    asColorTargetState(state = {}) {
        return Object.assign(Object.assign({}, state), { format: this.descriptor.format });
    }
}
export class TextureView {
    constructor(texture, descriptor = undefined) {
        this.texture = texture;
        this.view = texture.texture.createView(descriptor);
    }
    colorAttachment(clearValue = undefined) {
        return {
            view: this.view,
            storeOp: clearValue === undefined || this.texture.isSource ? "store" : "discard",
            loadOp: clearValue === undefined ? "load" : "clear",
            clearValue: clearValue,
        };
    }
    depthAttachment(clearValue = 1) {
        return {
            view: this.view,
            depthStoreOp: clearValue === undefined || this.texture.isSource ? "store" : "discard",
            depthLoadOp: clearValue === undefined ? "load" : "clear",
            depthClearValue: clearValue,
            stencilReadOnly: true,
        };
    }
}
export class Sampler {
    constructor(device, descriptor = undefined) {
        this.device = device;
        this.descriptor = descriptor;
        this.sampler = this.device.device.createSampler(descriptor);
    }
}
//# sourceMappingURL=texture.js.map