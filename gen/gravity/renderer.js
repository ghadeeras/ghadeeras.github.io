var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from '../djee/gpu/index.js';
import * as geo from './geo.js';
import { UniverseLayout } from './universe.js';
import { CanvasSizeManager } from '../utils/gear-canvas.js';
export class Renderer {
    constructor(device, canvas, visuals, renderShader) {
        this.device = device;
        this.canvas = canvas;
        this.visuals = visuals;
        this.bodyDesc = gpu.vertex({
            massAndRadius: gpu.f32.x2
        });
        this.bodyPosition = UniverseLayout.bodyState.asVertex(['position']);
        this.mesh = new geo.ShaderMesh(device, geo.sphere(18, 9));
        this.depthTexture = canvas.depthTexture();
        const sizeManager = new CanvasSizeManager(true);
        sizeManager.observe(canvas.element, () => this.resize());
        visuals.aspectRatio = canvas.element.width / canvas.element.height;
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader);
    }
    createPipeline(shaderModule) {
        return shaderModule.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [
                this.bodyDesc.asBufferLayout('instance'),
                this.bodyPosition.asBufferLayout('instance'),
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
            layout: this.device.device.createPipelineLayout({
                label: "rendererPipelineLayout",
                bindGroupLayouts: [this.visuals.layout.bindGroupLayout.wrapped]
            })
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
        this.device.enqueueCommand("render", encoder => {
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
export function newRenderer(device, canvas, visuals) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaderModule = yield device.loadShaderModule("gravity-render.wgsl");
        return new Renderer(device, canvas, visuals, shaderModule);
    });
}
//# sourceMappingURL=renderer.js.map