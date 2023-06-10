import * as gpu from '../djee/gpu/index.js'
import { Universe, UniverseLayout } from './universe.js'
import { Visuals } from './visuals.js'
import * as r from './renderer.js'


export class Renderer implements r.Renderer {

    private bodyDesc = gpu.vertex({
        massAndRadius: gpu.f32.x2
    })  

    private bodyPosition = UniverseLayout.bodyState.asVertex(['position'])

    private pipeline: GPURenderPipeline
    
    constructor(private device: gpu.Device, private canvas: gpu.Canvas, private visuals: Visuals, renderShader: gpu.ShaderModule) {
        visuals.aspectRatio = canvas.element.width / canvas.element.height
    
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader)
    }

    private createPipeline(shaderModule: gpu.ShaderModule): GPURenderPipeline {
        return shaderModule.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [
                this.bodyDesc.asBufferLayout('vertex'),
                this.bodyPosition.asBufferLayout('vertex'),
            ]),
            fragment: shaderModule.fragmentState("f_main", [{
                format: this.canvas.format,
                blend: {
                    color: {
                        srcFactor: "one",
                        dstFactor: "one",
                        operation: "add"
                    },
                    alpha: {
                        srcFactor: "one",
                        dstFactor: "one",
                        operation: "max"
                    }
                }
            }]),
            primitive: {
                topology: "point-list",
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
        this.visuals.aspectRatio = this.canvas.element.width / this.canvas.element.height
    }

    render(universe: Universe) {
        const descriptor: GPURenderPassDescriptor = {
            colorAttachments: [this.canvas.attachment({ r: 0, g: 0, b: 0, a: 1 })],
        }
        this.device.enqueueCommand("render", encoder => {
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.visuals.bindGroup.wrapped)
                pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer)
                pass.setVertexBuffer(1, universe.currentState.buffer)
                pass.draw(universe.bodiesCount)
            })
        })
    }

}

export async function newRenderer(device: gpu.Device, canvas: string, visuals: Visuals) {
    const shaderModule = await device.loadShaderModule("gravity-render.points.wgsl")
    return new Renderer(device, device.canvas(canvas), visuals, shaderModule)
}
