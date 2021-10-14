import { required } from "./utils.js";
export class Canvas {
    constructor(canvas, device, adapter) {
        var _a;
        this.device = device;
        this.element = typeof canvas === 'string' ?
            required(document.getElementById(canvas)) :
            canvas;
        this.context = required((_a = this.element.getContext("webgpu")) !== null && _a !== void 0 ? _a : this.element.getContext("gpupresent"));
        const pixelRatio = window.devicePixelRatio;
        this.sampleCount = Math.pow(Math.ceil(pixelRatio), 2);
        this.size = {
            width: Math.round(this.element.clientWidth * pixelRatio),
            height: Math.round(this.element.clientHeight * pixelRatio),
        };
        this.format = this.context.getPreferredFormat(adapter);
        this.context.configure({
            size: this.size,
            format: this.format,
            device: device,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.colorView = device.createTexture({
            size: this.size,
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount,
        });
    }
    attachment(clearColor) {
        return {
            view: this.colorView.createView(),
            resolveTarget: this.context.getCurrentTexture().createView(),
            loadValue: clearColor,
            storeOp: "discard",
        };
    }
    depthTexture() {
        return this.device.createTexture({
            size: this.size,
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount
        });
    }
    destroy() {
        this.colorView.destroy();
        this.context.unconfigure();
    }
}
//# sourceMappingURL=canvas.js.map