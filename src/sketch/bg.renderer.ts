import { gpu } from "lumen"

export class BackgroundRenderer {

    private sampler: gpu.Sampler

    constructor(private pipelineLayout: PipelineLayout, private pipeline: GPURenderPipeline) {
        this.sampler = pipelineLayout.device.sampler({
            minFilter: "linear",
            magFilter: "linear",
            mipmapFilter: "linear",
            addressModeU: "repeat",
            addressModeV: "repeat",
        })
    }

    static async create(device: gpu.Device, format = navigator.gpu.getPreferredCanvasFormat()): Promise<BackgroundRenderer> {
        const layout = pipelineLayout(device)
        const module = await device.shaderModule({ code: shader })
        const pipeline = await device.wrapped.createRenderPipelineAsync({
            layout: layout.wrapped,
            vertex: {
                module: module.wrapped
            },
            fragment: {
                module: module.wrapped,
                targets: [{ 
                    format,
                }]
            },
            primitive: {
                topology: "triangle-list",
            },
            multisample: {
                count: 4,
            },
        })
        return new BackgroundRenderer(layout, pipeline)
    }

    async background(texture: gpu.Texture): Promise<BackgroundGroup> {
        await texture.generateMipmaps()
        return this.pipelineLayout.bindGroup("background", {
            background_texture: texture,
            background_sampler: this.sampler
        })
    }

    renderTo(attachment: GPURenderPassColorAttachment, background: BackgroundGroup) {
        this.pipelineLayout.device.enqueueCommands("background rendering", encoder => {
            encoder.renderPass({ colorAttachments: [ attachment ] }, pass => {
                pass.setPipeline(this.pipeline)
                this.pipelineLayout.addTo(pass, { background })
                pass.draw(3)
            })
        })
    }

}

type PipelineLayout = ReturnType<typeof pipelineLayout>
function pipelineLayout(device: gpu.Device) {
    return device.pipelineLayout({
        background: backgroundGroupLayout(device).asEntry(0)
    }, "background pipeline layout")
}

export type BackgroundGroup = gpu.CompatibleBindGroup<BackgroundGroupLayout>
type BackgroundGroupLayout = ReturnType<typeof backgroundGroupLayout>
function backgroundGroupLayout(device: gpu.Device) {
    return device.groupLayout({
        background_texture: gpu.texture_2d("float").asEntry(0, "FRAGMENT"),
        background_sampler: gpu.sampler("filtering").asEntry(1, "FRAGMENT")
    }, "background group layout")
}

const shader = gpu.renderingShaders.fullScreenPassVertex(/* wgsl */ `

    @group(0) @binding(0) var background_texture: texture_2d<f32>;
    @group(0) @binding(1) var background_sampler: sampler;

    @fragment
    fn f_main(varyings: Varyings) -> @location(0) vec4<f32> {
        let uv = varyings.clipPosition * vec2(0.5, -0.5) + 0.5;
        return textureSample(background_texture, background_sampler, uv);
    }

`)