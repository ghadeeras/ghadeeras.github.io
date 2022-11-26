export class NormalsFilter {
    constructor(shaderModule, size, outputFormat) {
        this.size = size;
        this.outputFormat = outputFormat;
        const device = shaderModule.device;
        this.normalsTexture = device.texture({
            format: "rgba32float",
            size: size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        const groupLayout = device.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "unfilterable-float",
                        viewDimension: "2d"
                    }
                }]
        });
        this.pipeline = device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                outputFormat
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            },
            layout: device.device.createPipelineLayout({
                bindGroupLayouts: [groupLayout]
            })
        });
        this.group = device.bindGroup(groupLayout, [this.normalsTexture.createView().asBindingResource()]);
    }
    attachment() {
        return this.normalsTexture.createView().colorAttachment({ r: 0.0, g: 0.0, b: 1.0, a: 256.0 });
    }
    render(encoder, colorAttachment) {
        encoder.renderPass({ colorAttachments: [colorAttachment] }, pass => {
            pass.setBindGroup(0, this.group);
            pass.setPipeline(this.pipeline);
            pass.draw(4);
        });
    }
}
//# sourceMappingURL=filter.gpu.js.map