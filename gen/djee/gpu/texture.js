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
    depthState(state = {}) {
        var _a, _b, _c;
        return Object.assign(Object.assign({}, state), { format: (_a = state.format) !== null && _a !== void 0 ? _a : formatOf(this.descriptor.format), depthCompare: (_b = state.depthCompare) !== null && _b !== void 0 ? _b : "less", depthWriteEnabled: (_c = state.depthWriteEnabled) !== null && _c !== void 0 ? _c : true });
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