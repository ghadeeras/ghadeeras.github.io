import * as gpu from '../djee/gpu/index.js'
import * as geo from './geo.js'
import { Universe } from './universe.js'
import { Visuals } from './visuals.js'
import * as r from './renderer.js'
import * as meta from './meta.js'

export class Renderer implements r.Renderer {

    private mesh: geo.ShaderMesh 

    private pipeline: GPURenderPipeline
    
    private depthTexture: gpu.Texture

    constructor(private layout: meta.AppLayout, private canvas: gpu.Canvas, private visuals: Visuals, renderShader: gpu.ShaderModule) {
        this.mesh = new geo.ShaderMesh(layout.device, geo.sphere(18, 9))

        this.depthTexture = canvas.depthTexture()
        visuals.aspectRatio = canvas.element.width / canvas.element.height
    
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader)
    }

    private createPipeline(shaderModule: gpu.ShaderModule): GPURenderPipeline {
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
        })
    }

    resize() {
        this.canvas.resize()
        this.depthTexture.resize(this.canvas.size)
        this.visuals.aspectRatio = this.canvas.element.width / this.canvas.element.height
    }

    render(universe: Universe) {
        const descriptor: GPURenderPassDescriptor = {
            colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
            depthStencilAttachment: this.depthTexture.createView().depthAttachment()
        }
        this.layout.device.enqueueCommand("render", encoder => {
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.visuals.bindGroup.wrapped)
                pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer)
                pass.setVertexBuffer(1, universe.currentState.buffer)
                pass.setVertexBuffer(2, this.mesh.verticesBuffer.buffer)
                pass.setIndexBuffer(this.mesh.indicesBuffer.buffer, this.mesh.indexFormat)
                pass.drawIndexed(this.mesh.mesh.indices.length, universe.bodiesCount, 0, 0)
            })
        })
    }

}

export async function newRenderer(layout: meta.AppLayout, canvas: string, visuals: Visuals) {
    const device = layout.device
    const shaderModule = await device.loadShaderModule("gravity-render.wgsl")
    return new Renderer(layout, device.canvas(canvas, 4), visuals, shaderModule)
}
