import { required } from "../../utils/misc.js";
export class Canvas {
    constructor(device, canvas, withMultiSampling = true) {
        var _a;
        this.device = device;
        this.element = typeof canvas === 'string' ?
            required(document.getElementById(canvas)) :
            canvas;
        this.context = required((_a = this.element.getContext("webgpu")) !== null && _a !== void 0 ? _a : this.element.getContext("gpupresent"));
        const pixelRatio = withMultiSampling ? window.devicePixelRatio : 1;
        this.sampleCount = Math.pow(Math.ceil(pixelRatio), 2);
        this.size = {
            width: Math.round(this.element.clientWidth * pixelRatio),
            height: Math.round(this.element.clientHeight * pixelRatio),
        };
        this.format = this.context.getPreferredFormat(device.adapter);
        this.context.configure({
            size: this.size,
            format: this.format,
            device: device.device,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            compositingAlphaMode: "opaque",
        });
        this.colorTexture = this.sampleCount !== 1 ? device.texture({
            size: this.size,
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount,
        }) : null;
    }
    attachment(clearColor) {
        return this.colorTexture ? {
            view: this.colorTexture.createView(),
            resolveTarget: this.context.getCurrentTexture().createView(),
            storeOp: "discard",
            loadOp: "clear",
            clearValue: clearColor,
        } : {
            view: this.context.getCurrentTexture().createView(),
            storeOp: "store",
            loadOp: "clear",
            clearValue: clearColor,
        };
    }
    depthTexture() {
        return this.device.texture({
            size: this.size,
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.sampleCount
        });
    }
    multiSampleState() {
        return this.colorTexture ? {
            count: this.sampleCount
        } : undefined;
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