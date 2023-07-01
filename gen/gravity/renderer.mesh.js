var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as geo from './geo.js';
import * as meta from './meta.js';
export class Renderer {
    constructor(layout, canvas, visuals, renderShader) {
        this.layout = layout;
        this.canvas = canvas;
        this.visuals = visuals;
        this.mesh = new geo.ShaderMesh(layout.device, geo.sphere(18, 9));
        this.depthTexture = canvas.depthTexture();
        visuals.aspectRatio = canvas.element.width / canvas.element.height;
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader);
    }
    createPipeline(shaderModule) {
        return shaderModule.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [
                meta.bodyDescriptionAsVertex.asBufferLayout('instance'),
                meta.bodyPosition.asBufferLayout('instance'),
                this.mesh.vertexLayout
            ]),
            fragment: shaderModule.fragmentState("f_main", [this.canvas]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: this.mesh.mesh.topology,
                stripIndexFormat: this.mesh.indexFormat,
            },
            multisample: {
                count: this.canvas.sampleCount
            },
            layout: this.layout.pipelineLayouts.renderer.wrapped
        });
    }
    resize() {
        this.canvas.resize();
        this.depthTexture.resize(this.canvas.size);
        this.visuals.aspectRatio = this.canvas.element.width / this.canvas.element.height;
    }
    render(universe) {
        const descriptor = {
            colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
            depthStencilAttachment: this.depthTexture.createView().depthAttachment()
        };
        this.layout.device.enqueueCommand("render", encoder => {
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, this.visuals.bindGroup.wrapped);
                pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer);
                pass.setVertexBuffer(1, universe.currentState.buffer);
                pass.setVertexBuffer(2, this.mesh.verticesBuffer.buffer);
                pass.setIndexBuffer(this.mesh.indicesBuffer.buffer, this.mesh.indexFormat);
                pass.drawIndexed(this.mesh.mesh.indices.length, universe.bodiesCount, 0, 0);
            });
        });
    }
}
export function newRenderer(layout, canvas, visuals) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = layout.device;
        const shaderModule = yield device.loadShaderModule("gravity-render.wgsl");
        return new Renderer(layout, device.canvas(canvas, 4), visuals, shaderModule);
    });
}
//# sourceMappingURL=renderer.mesh.js.map