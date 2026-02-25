import * as geo from './geo.js';
import * as meta from './meta.js';
export class Renderer {
    constructor(app, canvas, visuals) {
        this.app = app;
        this.canvas = canvas;
        this.visuals = visuals;
        this.mesh = new geo.ShaderMesh(app.device, geo.sphere(18, 9));
        this.depthTexture = canvas.depthTexture();
        visuals.aspectRatio = canvas.element.width / canvas.element.height;
        /* Pipeline */
        this.pipeline = this.createPipeline(app.shaders.meshRenderer);
    }
    createPipeline(shaderModule) {
        return shaderModule.device.wrapped.createRenderPipeline({
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
            layout: this.app.layout.pipelineLayouts.renderer.wrapped
        });
    }
    resize() {
        this.canvas.resize();
        this.depthTexture.size = this.canvas.size;
        this.visuals.aspectRatio = this.canvas.element.width / this.canvas.element.height;
    }
    render(universe) {
        const descriptor = {
            colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
            depthStencilAttachment: this.depthTexture.createView().depthAttachment()
        };
        this.app.device.enqueueCommands("render", encoder => {
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, this.visuals.bindGroup.wrapped);
                pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.wrapped);
                pass.setVertexBuffer(1, universe.currentState.wrapped);
                pass.setVertexBuffer(2, this.mesh.verticesBuffer.wrapped);
                pass.setIndexBuffer(this.mesh.indicesBuffer.wrapped, this.mesh.indexFormat);
                pass.drawIndexed(this.mesh.mesh.indices.length, universe.bodiesCount, 0, 0);
            });
        });
    }
}
//# sourceMappingURL=renderer.mesh.js.map