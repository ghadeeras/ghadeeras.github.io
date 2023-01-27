var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Denoiser {
    constructor(shaderModule, size, inputColorsFormat, inputNormalsFormat, outputFormat) {
        this.size = size;
        this.inputColorsFormat = inputColorsFormat;
        this.inputNormalsFormat = inputNormalsFormat;
        this.outputFormat = outputFormat;
        this.device = shaderModule.device;
        this.colorsTexture = this.device.texture({
            format: inputColorsFormat,
            size: size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.normalsTexture = this.device.texture({
            format: inputNormalsFormat,
            size: size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.groupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "unfilterable-float",
                        viewDimension: "2d"
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "unfilterable-float",
                        viewDimension: "2d"
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
        this._group = this.device.bindGroup(this.groupLayout, [
            this.colorsTexture.createView(),
            this.normalsTexture.createView(),
        ]);
    }
    attachments(clearColor, clearNormal) {
        return [
            this.colorsTexture.createView().colorAttachment(clearColor),
            this.normalsTexture.createView().colorAttachment(clearNormal),
        ];
    }
    render(encoder, colorAttachment) {
        encoder.renderPass({ colorAttachments: [colorAttachment] }, pass => {
            pass.setBindGroup(0, this._group);
            pass.setPipeline(this.pipeline);
            pass.draw(4);
        });
    }
    static create(device, size, inputColorsFormat, inputNormalsFormat, outputFormat) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Denoiser(yield device.loadShaderModule("denoiser.wgsl"), size, inputColorsFormat, inputNormalsFormat, outputFormat);
        });
    }
}
//# sourceMappingURL=denoiser.js.map