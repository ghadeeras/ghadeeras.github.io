import * as gpu from '../djee/gpu/index.js'
import * as geo from './geo.js'
import { Universe, UniverseLayout } from './universe.js'
import { CanvasSizeManager } from '../utils/gear.js'
import { Visuals } from './visuals.js'

export class Renderer {

    private bodyDesc = gpu.vertex({
        massAndRadius: gpu.f32.x2
    })  

    private bodyPosition = UniverseLayout.bodyState.asVertex(['position'])

    private mesh: geo.ShaderMesh 

    private pipeline: GPURenderPipeline
    
    private depthTexture: gpu.Texture

    constructor(private device: gpu.Device, private canvas: gpu.Canvas, private visuals: Visuals, renderShader: gpu.ShaderModule) {
        this.mesh = new geo.ShaderMesh(device, geo.sphere(18, 9))

        this.depthTexture = canvas.depthTexture()
        const sizeManager = new CanvasSizeManager(true)
        sizeManager.observe(canvas.element, () => this.resize())
        visuals.aspectRatio = canvas.element.width / canvas.element.height
    
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader)
    }

    private createPipeline(shaderModule: gpu.ShaderModule): GPURenderPipeline {
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
                label:"rendererPipelineLayout",
                bindGroupLayouts: [this.visuals.layout.bindGroupLayout.wrapped]
            })
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
        this.device.enqueueCommand("render", encoder => {
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

export async function newRenderer(device: gpu.Device, canvas: gpu.Canvas, visuals: Visuals) {
    const shaderModule = await device.loadShaderModule("gravity-render.wgsl")
    return new Renderer(device, canvas, visuals, shaderModule)
}
