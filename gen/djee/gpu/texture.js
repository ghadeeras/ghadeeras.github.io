import { formatOf } from "./utils.js";
export class Texture {
    constructor(device, descriptor) {
        this.device = device;
        this.descriptor = descriptor;
        this.texture = this.device.device.createTexture(descriptor);
        this.view = this.texture.createView();
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
    depthAttachment(loadValue = 1) {
        return {
            view: this.view,
            depthLoadValue: loadValue,
            depthStoreOp: loadValue == "load" || this.isCopySrc ? "store" : "discard",
            stencilStoreOp: "discard",
            stencilLoadValue: 0,
        };
    }
    colorAttachment(loadValue = "load") {
        return {
            view: this.view,
            loadValue: loadValue,
            storeOp: loadValue == "load" || this.isCopySrc ? "store" : "discard",
        };
    }
    createView() {
        return this.texture.createView();
    }
    get isCopySrc() {
        return (this.descriptor.usage & GPUTextureUsage.COPY_SRC) !== 0;
    }
}
//# sourceMappingURL=texture.js.map