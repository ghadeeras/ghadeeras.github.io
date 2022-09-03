var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { uniformsStruct } from "./tracer.js";
export class Stacker {
    constructor(shaderModule, size, uniforms, normalsTexture, inputFormat, outputFormat) {
        var _a;
        this.size = size;
        this.uniforms = uniforms;
        this.normalsTexture = normalsTexture;
        this.inputFormat = inputFormat;
        this.outputFormat = outputFormat;
        this.device = shaderModule.device;
        this.maxLayersCount = (_a = size.depthOrArrayLayers) !== null && _a !== void 0 ? _a : this.device.device.limits.maxTextureArrayLayers;
        this.texture = this.device.texture({
            format: inputFormat,
            size: Object.assign(Object.assign({}, size), { depthOrArrayLayers: this.maxLayersCount }),
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.sampler = this.device.sampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "nearest",
            minFilter: "nearest",
        });
        this.frameViews = this.device.buffer("frameViews", GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, uniformsStruct.paddedSize * 256, uniformsStruct.paddedSize);
        this.groupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "read-only-storage",
                        minBindingSize: uniformsStruct.paddedSize * 256,
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "float",
                        viewDimension: "2d-array"
                    }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "unfilterable-float",
                        viewDimension: "2d"
                    }
                }, {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: "filtering"
                    }
                }]
        });
        this.pipeline = this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                outputFormat
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            },
            layout: this.device.device.createPipelineLayout({
                bindGroupLayouts: [this.groupLayout]
            })
        });
        this._layersCount = this.maxLayersCount;
        this._group = this.newGroup(this.maxLayersCount);
        this._layer = this.layersCount - 1;
    }
    newGroup(layersCount) {
        return this.device.bindGroup(this.groupLayout, [
            this.frameViews,
            this.texture.createView({
                dimension: "2d-array",
                baseArrayLayer: 0,
                arrayLayerCount: layersCount
            }).asBindingResource(),
            this.normalsTexture.createView().asBindingResource(),
            this.sampler.asBindingResource()
        ]);
    }
    get layer() {
        return this._layer;
    }
    get layersCount() {
        return this._layersCount;
    }
    set layersCount(count) {
        const c = Math.min(Math.max(count, 1), this.maxLayersCount);
        this._layersCount = c;
        this._group = this.newGroup(c);
        this._layer %= c;
    }
    colorAttachment(clearColor, colorAttachment = null) {
        this._layer = (this._layer + 1) % this.layersCount;
        this.frameViews.copyAt(uniformsStruct.paddedSize * this.layer, this.uniforms, 0, uniformsStruct.paddedSize);
        return this.layersCount < 2 && colorAttachment !== null
            ? colorAttachment
            : this.texture.createView({
                dimension: "2d",
                baseArrayLayer: this._layer,
                arrayLayerCount: 1
            }).colorAttachment(clearColor);
    }
    render(encoder, colorAttachment) {
        encoder.renderPass({ colorAttachments: [colorAttachment] }, pass => {
            pass.setBindGroup(0, this._group);
            pass.setPipeline(this.pipeline);
            pass.draw(4, 1, 0, this._layer);
        });
    }
    static create(device, size, uniforms, normalsTexture, inputFormat, outputFormat) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Stacker(yield device.loadShaderModule("stacker2.wgsl"), size, uniforms, normalsTexture, inputFormat, outputFormat);
        });
    }
}
//# sourceMappingURL=stacker2.js.map