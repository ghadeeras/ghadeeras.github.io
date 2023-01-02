import { formatOf } from "./utils.js";
export class Texture {
    constructor(device, descriptor) {
        this.device = device;
        this.descriptor = descriptor;
        this._texture = this.device.device.createTexture(descriptor);
    }
    get texture() {
        return this._texture;
    }
    get size() {
        if ('width' in this.descriptor.size) {
            return this.descriptor.size;
        }
        else {
            const [width, height] = this.descriptor.size;
            return { width, height };
        }
    }
    destroy() {
        this._texture.destroy();
    }
    resize(size) {
        this.descriptor.size = size;
        this._texture.destroy();
        this._texture = this.device.device.createTexture(this.descriptor);
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
    asBindingResource() {
        return this.view;
    }
}
export class Sampler {
    constructor(device, descriptor = undefined) {
        this.device = device;
        this.descriptor = descriptor;
        this.sampler = this.device.device.createSampler(descriptor);
    }
    asBindingResource() {
        return this.sampler;
    }
}
//# sourceMappingURL=texture.js.map