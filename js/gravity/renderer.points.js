import { Filter1D, gaussianWeights } from './filter.1d.js';
import { BaseTexture } from './base.texture.js';
import * as meta from './meta.js';
export class Renderer {
    constructor(app, canvas, visuals, filter, baseTexture) {
        this.app = app;
        this.canvas = canvas;
        this.visuals = visuals;
        this.filter = filter;
        this.baseTexture = baseTexture;
        visuals.aspectRatio = canvas.element.width / canvas.element.height;
        this.texture = app.device.texture({
            label: "saturated-channel",
            format: "rgba16float",
            size: canvas.size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
        });
        /* Pipeline */
        this.pipeline = this.createPipeline(app.shaders.pointsRenderer);
        this.filtering = filter.forTexture(this.texture);
        this.baseTextureRenderer = this.baseTexture.rendererFor(this.texture);
    }
    createPipeline(shaderModule) {
        return shaderModule.device.wrapped.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [
                meta.bodyDescriptionAsVertex.asBufferLayout('vertex'),
                meta.bodyPosition.asBufferLayout('vertex'),
            ]),
            fragment: shaderModule.fragmentState("f_main", [{
                    format: this.texture.descriptor.format,
                    blend: {
                        color: {
                            srcFactor: "one",
                            dstFactor: "one",
                            operation: "add",
                        },
                        alpha: {
                            srcFactor: "one",
                            dstFactor: "one",
                            operation: "max",
                        },
                    }
                }]),
            primitive: {
                topology: "point-list",
            },
            multisample: {
                count: this.canvas.sampleCount
            },
            layout: this.app.layout.pipelineLayouts.renderer.wrapped
        });
    }
    resize() {
        this.canvas.resize();
        this.texture.size = this.canvas.size;
        this.filtering.destroy();
        this.filtering = this.filter.forTexture(this.texture);
        this.baseTextureRenderer = this.baseTexture.rendererFor(this.texture);
        this.visuals.aspectRatio = this.canvas.element.width / this.canvas.element.height;
    }
    render(universe) {
        const descriptor1 = {
            colorAttachments: [this.texture.createView().colorAttachment({ r: 0, g: 0, b: 0, a: 0 })],
        };
        const descriptor2 = {
            colorAttachments: [this.texture.createView().colorAttachment()],
        };
        this.app.device.enqueueCommands("render", encoder => {
            encoder.renderPass(descriptor1, pass => this.draw(pass, universe));
            this.filtering.apply(encoder, 4);
            encoder.renderPass(descriptor2, pass => this.draw(pass, universe));
            this.baseTextureRenderer.render(encoder, this.canvas.attachment({ r: 0, g: 0, b: 0, a: 0 }));
        });
    }
    draw(pass, universe) {
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.visuals.bindGroup.wrapped);
        pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.wrapped);
        pass.setVertexBuffer(1, universe.currentState.wrapped);
        pass.draw(universe.bodiesCount);
    }
}
export function newRenderer(app, canvas, visuals, wgX, wgY) {
    const filter = new Filter1D(app, gaussianWeights(1 / 8, 8), [wgX, wgY]);
    const baseTexture = new BaseTexture(app, canvas);
    return new Renderer(app, canvas, visuals, filter, baseTexture);
}
//# sourceMappingURL=renderer.points.js.map