var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Integrator {
    constructor(shaderModule, canvas, maxLayersCount) {
        this.canvas = canvas;
        this.maxLayersCount = maxLayersCount;
        this.device = shaderModule.device;
        this.texture = this.device.texture({
            format: canvas.format,
            size: {
                width: canvas.size.width,
                height: canvas.size.height,
                depthOrArrayLayers: maxLayersCount,
            },
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
        this._layersCount = maxLayersCount;
        this._group = this.newGroup(maxLayersCount);
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
        const c = Math.min(Math.max(count, 0), this.maxLayersCount);
        this._layersCount = c;
        this._group = this.newGroup(c);
        this.layer %= c;
    }
    colorAttachment(clearColor) {
        return this.layersCount < 2
            ? this.canvas.attachment(clearColor)
            : this.texture.createView({
                dimension: "2d",
                baseArrayLayer: this.layer,
                arrayLayerCount: 1
            }).colorAttachment(clearColor);
    }
    encode(encoder) {
        this.layer = (this.layer + 1) % this.layersCount;
        if (this.layersCount > 1) {
            encoder.renderPass({
                colorAttachments: [
                    this.canvas.attachment({ r: 0, g: 0, b: 0, a: 1 })
                ]
            }, pass => {
                pass.setBindGroup(0, this._group);
                pass.setPipeline(this.pipeline);
                pass.draw(4);
            });
        }
    }
    static create(device, canvas, maxLayersCount = device.device.limits.maxTextureArrayLayers) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Integrator(yield device.loadShaderModule("integrator.wgsl"), canvas, maxLayersCount);
        });
    }
}
//# sourceMappingURL=integrator.js.map