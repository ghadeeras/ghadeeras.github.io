export class Denoiser {
    constructor(gpuToy, size, inputColorsFormat, inputNormalsFormat, outputFormat) {
        this.size = size;
        this.inputColorsFormat = inputColorsFormat;
        this.inputNormalsFormat = inputNormalsFormat;
        this.outputFormat = outputFormat;
        this.device = gpuToy.device;
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
        this.pipeline = this.device.wrapped.createRenderPipeline({
            vertex: gpuToy.shaders.denoiser.vertexState("v_main", []),
            fragment: gpuToy.shaders.denoiser.fragmentState("f_main", [
                outputFormat
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            },
            layout: gpuToy.pipelineLayouts.denoiser.wrapped
        });
        this._group = gpuToy.groupLayouts.denoiser.bindGroup({
            colors: this.colorsTexture.createView(),
            normals: this.normalsTexture.createView(),
        });
    }
    attachments(clearColor, clearNormal) {
        return [
            this.colorsTexture.createView().colorAttachment(clearColor),
            this.normalsTexture.createView().colorAttachment(clearNormal),
        ];
    }
    render(encoder, colorAttachment) {
        encoder.renderPass({ colorAttachments: [colorAttachment] }, pass => {
            pass.setBindGroup(0, this._group.wrapped);
            pass.setPipeline(this.pipeline);
            pass.draw(4);
        });
    }
}
//# sourceMappingURL=denoiser.js.map