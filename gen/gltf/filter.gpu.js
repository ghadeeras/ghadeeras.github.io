export class NormalsFilter {
    constructor(shaderModule, size, outputFormat, uniforms) {
        this.size = size;
        this.outputFormat = outputFormat;
        this.uniforms = uniforms;
        const device = shaderModule.device;
        this.normalsTexture = device.texture({
            format: "rgba32float",
            size: size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.groupLayout = device.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "unfilterable-float",
                        viewDimension: "2d"
                    }
                }
            ]
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
                bindGroupLayouts: [this.groupLayout]
            })
        });
        this.group = device.bindGroup(this.groupLayout, [
            this.uniforms.asBindingResource(),
            this.normalsTexture.createView().asBindingResource()
        ]);
    }
    attachment() {
        return this.normalsTexture.createView().colorAttachment({ r: 0.0, g: 0.0, b: 1.0, a: 256.0 });
    }
    resize(width, height) {
        this.normalsTexture.resize({ width, height });
        this.group = this.normalsTexture.device.bindGroup(this.groupLayout, [
            this.uniforms.asBindingResource(),
            this.normalsTexture.createView().asBindingResource()
        ]);
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