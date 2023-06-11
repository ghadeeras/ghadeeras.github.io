import * as gpu from '../djee/gpu/index.js'
import { Universe, UniverseLayout } from './universe.js'
import { Visuals } from './visuals.js'
import * as r from './renderer.js'
import { Filter1D, Filtering1D, gaussianWeights } from './filter.1d.js'
import { BaseTexture, BaseTextureRenderer } from './base.texture.js'

export class Renderer implements r.Renderer {

    private bodyDesc = gpu.vertex({
        massAndRadius: gpu.f32.x2
    })  

    private bodyPosition = UniverseLayout.bodyState.asVertex(['position'])
    private texture: gpu.Texture;
    private pipeline: GPURenderPipeline
    private filtering: Filtering1D
    private baseTextureRenderer: BaseTextureRenderer
    
    constructor(private device: gpu.Device, private canvas: gpu.Canvas, private visuals: Visuals, renderShader: gpu.ShaderModule, private filter: Filter1D, private baseTexture: BaseTexture) {
        visuals.aspectRatio = canvas.element.width / canvas.element.height

        this.texture = device.texture({
            label: "saturated-channel",
            format: "rgba16float",
            size: canvas.size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
        })
    
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader)

        this.filtering = filter.forTexture(this.texture)
        this.baseTextureRenderer = this.baseTexture.rendererFor(this.texture)
    }

    private createPipeline(shaderModule: gpu.ShaderModule): GPURenderPipeline {
        return shaderModule.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [
                this.bodyDesc.asBufferLayout('vertex'),
                this.bodyPosition.asBufferLayout('vertex'),
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
            layout: this.device.device.createPipelineLayout({ 
                label:"rendererPipelineLayout",
                bindGroupLayouts: [this.visuals.layout.bindGroupLayout.wrapped]
            })
        })
    }

    resize() {
        this.canvas.resize()
        this.texture.resize(this.canvas.size)
        this.filtering.destroy()
        this.filtering = this.filter.forTexture(this.texture)
        this.baseTextureRenderer = this.baseTexture.rendererFor(this.texture)
        this.visuals.aspectRatio = this.canvas.element.width / this.canvas.element.height
    }

    render(universe: Universe) {
        const descriptor1: GPURenderPassDescriptor = {
            colorAttachments: [this.texture.createView().colorAttachment({ r: 0, g: 0, b: 0, a: 0})],
        }
        const descriptor2: GPURenderPassDescriptor = {
            colorAttachments: [this.texture.createView().colorAttachment()],
        }
        this.device.enqueueCommand("render", encoder => {
            encoder.renderPass(descriptor1, pass => this.draw(pass, universe))
            this.filtering.apply(encoder, 4)
            encoder.renderPass(descriptor2, pass => this.draw(pass, universe))
            this.baseTextureRenderer.render(encoder, this.canvas.attachment({ r: 0, g: 0, b: 0, a: 0 }))
        })
    }


    private draw(pass: GPURenderPassEncoder, universe: Universe) {
        pass.setPipeline(this.pipeline)
        pass.setBindGroup(0, this.visuals.bindGroup.wrapped)
        pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer)
        pass.setVertexBuffer(1, universe.currentState.buffer)
        pass.draw(universe.bodiesCount)
    }
}

export async function newRenderer(device: gpu.Device, canvas: string, visuals: Visuals) {
    const shaderModule = await device.loadShaderModule("gravity-render.points.wgsl")
    const gpuCanvas = device.canvas(canvas);
    const filter = await Filter1D.create(device, gaussianWeights(1 / 8, 8));
    const baseTexture =  await BaseTexture.create(device, gpuCanvas)
    return new Renderer(device, gpuCanvas, visuals, shaderModule, filter, baseTexture)
}
