import { gpu } from 'lumen';
import * as meta from './meta.js';

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

    private pipeline: GPURenderPipeline

    private sampler: gpu.Sampler;

    constructor(private app: meta.App, target: gpu.TextureFormatSource) {
        this.pipeline = app.device.device.createRenderPipeline({
            layout: app.layout.pipelineLayouts.texturePasting.wrapped,
            vertex: app.shaders.baseTexture.vertexState("v_main", []),
            fragment: app.shaders.baseTexture.fragmentState("f_main", [target]),
            primitive: {
                topology: "triangle-list"
            },
            label: "BaseTexturePipeline"
        })
        this.sampler = app.device.sampler()
    }

    rendererFor(texture: gpu.Texture): BaseTextureRenderer {
        const group = this.app.layout.groupLayouts.sampledTexture.instance({ 
            label: "BaseTextureGroup",
            entries: {
                textureSampler: this.sampler,
                baseTexture: texture.createView()
            }
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

}

export class BaseTextureRenderer {

    constructor(readonly render: (encoder: gpu.CommandEncoder, attachment: GPURenderPassColorAttachment) => void) {
    }

} 