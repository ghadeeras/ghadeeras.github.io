var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Stacker {
    constructor(shaderModule, size, format) {
        var _a;
        this.size = size;
        this.format = format;
        this.device = shaderModule.device;
        this.maxLayersCount = (_a = size.depthOrArrayLayers) !== null && _a !== void 0 ? _a : this.device.device.limits.maxTextureArrayLayers;
        this.texture = this.device.texture({
            format: format,
            size: Object.assign(Object.assign({}, size), { depthOrArrayLayers: this.maxLayersCount }),
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.sampler = this.device.sampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "nearest",
            minFilter: "nearest",
        });
        this.pipeline = this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                this.texture
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            }
        });
        this.groupLayout = this.pipeline.getBindGroupLayout(0);
        this._layersCount = this.maxLayersCount;
        this._group = this.newGroup(this.maxLayersCount);
        this.layer = this.layersCount - 1;
    }
    newGroup(layersCount) {
        return this.device.createBindGroup(this.groupLayout, [
            this.texture.createView({
                dimension: "2d-array",
                baseArrayLayer: 0,
                arrayLayerCount: layersCount
            }),
            this.sampler
        ]);
    }
    get layersCount() {
        return this._layersCount;
    }
    set layersCount(count) {
        const c = Math.min(Math.max(count, 1), this.maxLayersCount);
        this._layersCount = c;
        this._group = this.newGroup(c);
        this.layer %= c;
    }
    colorAttachment(clearColor, colorAttachment = null) {
        this.layer = (this.layer + 1) % this.layersCount;
        return this.layersCount < 2 && colorAttachment !== null
            ? colorAttachment
            : this.texture.createView({
                dimension: "2d",
                baseArrayLayer: this.layer,
                arrayLayerCount: 1
            }).colorAttachment(clearColor);
    }
    render(encoder, colorAttachment) {
        if (this.layersCount > 1) {
            encoder.renderPass({ colorAttachments: [colorAttachment] }, pass => {
                pass.setBindGroup(0, this._group);
                pass.setPipeline(this.pipeline);
                pass.draw(4);
            });
        }
    }
    static create(device, size, format) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Stacker(yield device.loadShaderModule("stacker.wgsl"), size, format);
        });
    }
}
//# sourceMappingURL=stacker.js.map