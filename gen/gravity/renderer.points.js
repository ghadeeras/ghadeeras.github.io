var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Filter1D, gaussianWeights } from './filter.1d.js';
import { BaseTexture } from './base.texture.js';
import * as meta from './meta.js';
export class Renderer {
    constructor(layout, canvas, visuals, renderShader, filter, baseTexture) {
        this.layout = layout;
        this.canvas = canvas;
        this.visuals = visuals;
        this.filter = filter;
        this.baseTexture = baseTexture;
        visuals.aspectRatio = canvas.element.width / canvas.element.height;
        this.texture = layout.device.texture({
            label: "saturated-channel",
            format: "rgba16float",
            size: canvas.size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
        });
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader);
        this.filtering = filter.forTexture(this.texture);
        this.baseTextureRenderer = this.baseTexture.rendererFor(this.texture);
    }
    createPipeline(shaderModule) {
        return shaderModule.device.device.createRenderPipeline({
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
            layout: this.layout.pipelineLayouts.renderer.wrapped
        });
    }
    resize() {
        this.canvas.resize();
        this.texture.resize(this.canvas.size);
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
        this.layout.device.enqueueCommand("render", encoder => {
            encoder.renderPass(descriptor1, pass => this.draw(pass, universe));
            this.filtering.apply(encoder, 4);
            encoder.renderPass(descriptor2, pass => this.draw(pass, universe));
            this.baseTextureRenderer.render(encoder, this.canvas.attachment({ r: 0, g: 0, b: 0, a: 0 }));
        });
    }
    draw(pass, universe) {
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.visuals.bindGroup.wrapped);
        pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer);
        pass.setVertexBuffer(1, universe.currentState.buffer);
        pass.draw(universe.bodiesCount);
    }
}
export function newRenderer(layout, canvas, visuals) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = layout.device;
        const shaderModule = yield device.loadShaderModule("gravity-render.points.wgsl");
        const gpuCanvas = device.canvas(canvas);
        const filter = yield Filter1D.create(layout, gaussianWeights(1 / 8, 8));
        const baseTexture = yield BaseTexture.create(layout, gpuCanvas);
        return new Renderer(layout, gpuCanvas, visuals, shaderModule, filter, baseTexture);
    });
}
//# sourceMappingURL=renderer.points.js.map