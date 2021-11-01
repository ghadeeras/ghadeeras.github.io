export class Texture {
    constructor(device, descriptor) {
        this.device = device;
        this.descriptor = descriptor;
        this.texture = this.device.device.createTexture(descriptor);
        this.view = this.texture.createView();
    }
    destroy() {
        this.texture.destroy();
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
    createView() {
        return this.texture.createView();
    }
    get isCopySrc() {
        return (this.descriptor.usage & GPUTextureUsage.COPY_SRC) !== 0;
    }
}
//# sourceMappingURL=texture.js.map