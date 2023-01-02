import { required } from "../utils.js";
export class Canvas {
    constructor(device, canvas, sampleCount, configs = {}) {
        var _a, _b, _c, _d, _e;
        this.device = device;
        this.sampleCount = sampleCount;
        this._colorTexture = null;
        this.element = typeof canvas === 'string' ?
            required(document.getElementById(canvas)) :
            canvas;
        this.context = required(this.element.getContext("webgpu"));
        this._size = {
            width: this.element.width,
            height: this.element.height,
        };
        this.configs = {
            device: device.device,
            format: (_a = configs.format) !== null && _a !== void 0 ? _a : navigator.gpu.getPreferredCanvasFormat(),
            usage: (_b = configs.usage) !== null && _b !== void 0 ? _b : GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: (_c = configs.alphaMode) !== null && _c !== void 0 ? _c : "opaque",
            colorSpace: (_d = configs.colorSpace) !== null && _d !== void 0 ? _d : "srgb",
            viewFormats: (_e = configs.viewFormats) !== null && _e !== void 0 ? _e : [],
        };
        this.context.configure(this.configs);
        this.resize();
    }
    get size() {
        return this._size;
    }
    get colorTexture() {
        return this._colorTexture;
    }
    resize() {
        var _a, _b;
        if (this._colorTexture !== null) {
            this._colorTexture.destroy();
        }
        this._size = {
            width: this.element.width,
            height: this.element.height,
        };
        this._colorTexture = this.sampleCount !== 1 ? this.device.texture({
            format: this.configs.format,
            usage: ((_a = this.configs.usage) !== null && _a !== void 0 ? _a : 0) | GPUTextureUsage.RENDER_ATTACHMENT,
            viewFormats: this.configs.viewFormats,
            size: this.size,
            sampleCount: this.sampleCount,
            dimension: "2d",
            mipLevelCount: 1,
            label: `${(_b = this.element.id) !== null && _b !== void 0 ? _b : "canvas"}-multi-sample-texture`
        }) : null;
    }
    get format() {
        return this.configs.format;
    }
    attachment(clearColor) {
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
            };
    }
    depthTexture(descriptor = {}) {
        var _a, _b, _c, _d;
        return this.device.texture({
            size: this.size,
            sampleCount: this.sampleCount,
            format: (_a = descriptor.format) !== null && _a !== void 0 ? _a : "depth32float",
            usage: (_b = descriptor.usage) !== null && _b !== void 0 ? _b : GPUTextureUsage.RENDER_ATTACHMENT,
            label: (_c = descriptor.label) !== null && _c !== void 0 ? _c : `${(_d = this.element.id) !== null && _d !== void 0 ? _d : "canvas"}-depth-texture`
        });
    }
    multiSampleState() {
        return this.colorTexture
            ? { count: this.sampleCount }
            : undefined;
    }
    fragmentCount() {
        var _a;
        return this.size.width * ((_a = this.size.height) !== null && _a !== void 0 ? _a : 1) * this.sampleCount;
    }
    destroy() {
        if (this.colorTexture) {
            this.colorTexture.destroy();
        }
        this.context.unconfigure();
    }
}
//# sourceMappingURL=canvas.js.map