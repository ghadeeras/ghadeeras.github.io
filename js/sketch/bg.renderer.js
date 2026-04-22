import { gpu } from "lumen";
import * as cmn from "./common.js";
export class BackgroundRenderer {
    constructor(pipelineLayout, pipeline) {
        this.pipelineLayout = pipelineLayout;
        this.pipeline = pipeline;
        this.sampler = pipelineLayout.device.sampler({
            minFilter: "linear",
            magFilter: "linear",
            mipmapFilter: "linear",
            addressModeU: "repeat",
            addressModeV: "repeat",
        });
    }
    static async create(viewGroupLayout, format = navigator.gpu.getPreferredCanvasFormat()) {
        const device = viewGroupLayout.device;
        const layout = pipelineLayout(viewGroupLayout);
        const module = await device.shaderModule({ code: shader });
        const pipeline = await device.wrapped.createRenderPipelineAsync({
            layout: layout.wrapped,
            vertex: {
                module: module.wrapped
            },
            fragment: {
                module: module.wrapped,
                targets: [{
                        format,
                        blend: {
                            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                            alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
                        }
                    }]
            },
            primitive: {
                topology: "triangle-list",
            },
            multisample: {
                count: 4,
            },
        });
        return new BackgroundRenderer(layout, pipeline);
    }
    async background(texture) {
        await texture.generateMipmaps();
        return this.pipelineLayout.bindGroup("background", {
            background_texture: texture,
            background_sampler: this.sampler
        });
    }
    renderTo(attachment, background, view) {
        this.pipelineLayout.device.enqueueCommands("background rendering", encoder => {
            encoder.renderPass({ colorAttachments: [attachment] }, pass => {
                pass.setPipeline(this.pipeline);
                this.pipelineLayout.addTo(pass, { background, view });
                pass.draw(3);
            });
        });
    }
}
function pipelineLayout(viewGroupLayout) {
    const device = viewGroupLayout.device;
    const layouts = groupLayouts(viewGroupLayout);
    return device.pipelineLayout({
        background: layouts.background.asEntry(0),
        view: layouts.view.asEntry(1)
    }, "background pipeline layout");
}
function groupLayouts(viewGroupLayout) {
    const device = viewGroupLayout.device;
    return {
        ...device.groupLayouts({
            background: {
                background_texture: gpu.texture_2d("float").asEntry(0, "FRAGMENT"),
                background_sampler: gpu.sampler("filtering").asEntry(1, "FRAGMENT")
            }
        }),
        view: viewGroupLayout
    };
}
const shader = gpu.renderingShaders.fullScreenPassVertex(/* wgsl */ `

    ${cmn.commonWGSL}

    @group(0) @binding(0) var background_texture: texture_2d<f32>;
    @group(0) @binding(1) var background_sampler: sampler;

    @group(1) @binding(0)
    var<uniform> view: View;

    @fragment
    fn f_main(varyings: Varyings) -> @location(0) vec4<f32> {
        let position = view.inverse_matrix * vec3f(varyings.position.xy, 1.0);
        let uv = position.xy / vec2f(textureDimensions(background_texture));
        return textureSample(background_texture, background_sampler, uv);
    }

`);
//# sourceMappingURL=bg.renderer.js.map