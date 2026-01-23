import { uniformsStruct } from "./tracer.js";
export class Stacker {
    constructor(shaderModule, size, uniforms, normalsTexture, inputFormat, outputFormat) {
        this.size = size;
        this.uniforms = uniforms;
        this.normalsTexture = normalsTexture;
        this.inputFormat = inputFormat;
        this.outputFormat = outputFormat;
        this.device = shaderModule.device;
        this.maxLayersCount = size.depthOrArrayLayers ?? this.device.device.limits.maxTextureArrayLayers;
        this.texture = this.device.texture({
            format: inputFormat,
            size: {
                ...size,
                depthOrArrayLayers: this.maxLayersCount
            },
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.sampler = this.device.sampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
        });
        this.frameViews = this.device.dataBuffer("frameViews", {
            usage: ["STORAGE"],
            size: uniformsStruct.paddedSize * 256
        });
        this.groupLayout = this.device.device.createBindGroupLayout({
            label: "stacker-bind-group",
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
        return this.device.wrapped.createBindGroup({
            layout: this.groupLayout,
            entries: [{
                    binding: 0,
                    resource: this.frameViews.asBindingResource(),
                }, {
                    binding: 1,
                    resource: this.texture.createView({
                        dimension: "2d-array",
                        baseArrayLayer: 0,
                        arrayLayerCount: layersCount
                    }).asBindingResource(),
                }, {
                    binding: 2,
                    resource: this.normalsTexture.createView().asBindingResource(),
                }, {
                    binding: 3,
                    resource: this.sampler.asBindingResource(),
                }]
        });
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
        this.frameViews.copy(uniformsStruct.segment(this.layer)).from(this.uniforms, 0);
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
    static async create(device, size, uniforms, normalsTexture, inputFormat, outputFormat) {
        return new Stacker(await device.loadShaderModule("stacker.wgsl"), size, uniforms, normalsTexture, inputFormat, outputFormat);
    }
}
//# sourceMappingURL=stacker.js.map