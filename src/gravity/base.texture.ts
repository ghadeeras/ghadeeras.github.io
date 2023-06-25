import * as gpu from '../djee/gpu/index.js'

export class BaseTexture {

    static shaderCode = gpu.renderingShaders.fullScreenPassVertex(/*wgsl*/`
        
        @group(0) @binding(0)
        var textureSampler: sampler;

        @group(0) @binding(1)
        var baseTexture: texture_2d<f32>;

        @fragment
        fn f_main(varyings: Varyings) -> @location(0) vec4<f32> {
            let uv = 0.5 * vec2(1.0 + varyings.clipPosition.x, 1.0 - varyings.clipPosition.y);
            return textureSample(baseTexture, textureSampler, uv);
        }
    `)

    static groupLayoutEntries = {
        textureSampler: gpu.binding(0, GPUShaderStage.FRAGMENT, gpu.sampler("non-filtering")),
        baseTexture: gpu.binding(1, GPUShaderStage.FRAGMENT, gpu.texture("float")),
    } satisfies gpu.BindGroupLayoutEntries

    private groupLayout: gpu.BindGroupLayout<typeof BaseTexture.groupLayoutEntries>
    private pipeline: GPURenderPipeline

    private sampler: gpu.Sampler;

    constructor(shader: gpu.ShaderModule, target: gpu.TextureFormatSource) {
        const device = shader.device
        this.groupLayout = device.groupLayout("BaseTextureGroupLayout", BaseTexture.groupLayoutEntries)
        const pipelineLayout = device.pipelineLayout("BaseTexturePipelineLayout", {
            group: this.groupLayout.asGroup(0)
        })
        this.pipeline = device.device.createRenderPipeline({
            layout: pipelineLayout.wrapped,
            vertex: shader.vertexState("v_main", []),
            fragment: shader.fragmentState("f_main", [target]),
            primitive: {
                topology: "triangle-list"
            },
            label: "BaseTexturePipeline"
        })
        this.sampler = device.sampler()
    }

    rendererFor(texture: gpu.Texture): BaseTextureRenderer {
        const group = this.groupLayout.instance("BaseTextureGroup", {
            textureSampler: this.sampler,
            baseTexture: texture.createView()
        })
        return new BaseTextureRenderer((encoder, attachment) => {
            const descriptor = { colorAttachments: [attachment] };
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, group.wrapped)
                pass.draw(3)
            })
        })
    }

    static async create(device: gpu.Device, target: gpu.TextureFormatSource): Promise<BaseTexture> {
        const shader = await device.shaderModule("BaseTexture", BaseTexture.shaderCode)
        return new BaseTexture(shader, target)
    }

}

export class BaseTextureRenderer {

    constructor(readonly render: (encoder: gpu.CommandEncoder, attachment: GPURenderPassColorAttachment) => void) {
    }

} 