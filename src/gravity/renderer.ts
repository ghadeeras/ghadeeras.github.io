import * as ether from '../../ether/latest/index.js' 
import * as gpu from '../djee/gpu/index.js'
import * as geo from './geo.js'
import { DeferredComputation } from '../../gear/latest/scheduling.js'
import { Universe } from './universe.js'

export class Renderer {

    private bodyDesc = gpu.vertex({
        massAndRadius: gpu.f32.x2
    })  

    private bodyPosition = Universe.bodyState.asVertex(['position'])

    private bodySurfaceVertex = gpu.vertex({
        position: gpu.f32.x3
    })

    private readonly renderPipeline: GPURenderPipeline
    
    private readonly meshIndexFormat: GPUIndexFormat
    private readonly meshSize: number

    private readonly depthTexture: gpu.Texture

    private readonly renderingUniformsBuffer: gpu.Buffer
    private readonly meshIndicesBuffer: gpu.Buffer
    private readonly meshVertexBuffer: gpu.Buffer

    private readonly renderBindGroup: GPUBindGroup

    private _projectionMatrix = ether.mat4.projection(1)
    private _viewMatrix = ether.mat4.lookAt([0, 0, -24])
    private _modelMatrix = ether.mat4.identity()

    private readonly renderingUniformsData: number[] = [
        // mpvMatrix: mat4x4<f32>;
        ...this.mvpMatrix(), 
        // radiusScale: f32;
        0.05,
        // padding
        0,
        0,
        0,
    ]

    private updateRenderingUniformsData = new DeferredComputation(() => {
        this.renderingUniformsBuffer.writeAt(0, new Float32Array(this.renderingUniformsData))
    })

    constructor(private device: gpu.Device, private canvas: gpu.Canvas, renderShader: gpu.ShaderModule) {
        const mesh = geo.sphere(18, 9)
        this.meshIndexFormat = mesh.indexFormat ?? "uint16"
        this.meshSize = mesh.indices.length

        this.depthTexture = canvas.depthTexture()

        /* Pipeline */
        this.renderPipeline = this.createPipeline(renderShader, canvas, mesh)
        const renderBindGroupLayout = this.renderPipeline.getBindGroupLayout(0)

        /* Buffers */
        this.renderingUniformsBuffer = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, new Float32Array(this.renderingUniformsData))
        this.meshIndicesBuffer = device.buffer(GPUBufferUsage.INDEX, 1, new Uint16Array(mesh.indices))
        this.meshVertexBuffer = device.buffer(GPUBufferUsage.VERTEX, 1, new Float32Array(mesh.positions))

        /* Bind Groups */
        this.renderBindGroup = this.device.createBindGroup(renderBindGroupLayout, [this.renderingUniformsBuffer]) 
    }

    get projectionViewMatrix() {
        return ether.mat4.mul(
            this.projectionMatrix,
            this.viewMatrix
        )
    }

    get projectionMatrix() {
        return this._projectionMatrix
    }

    set projectionMatrix(m: ether.Mat<4>) {
        this._projectionMatrix = m
        this.updateMvpMatrix()
    }

    get viewMatrix() {
        return this._viewMatrix
    }

    set viewMatrix(m: ether.Mat<4>) {
        this._viewMatrix = m
        this.updateMvpMatrix()
    }

    get modelMatrix() {
        return this._modelMatrix
    }

    set modelMatrix(m: ether.Mat<4>) {
        this._modelMatrix = m
        this.updateMvpMatrix()
    }

    get radiusScale() {
        return this.renderingUniformsData[16]
    }

    set radiusScale(v: number) {
        this.renderingUniformsData[16] = v
        this.updateRenderingUniformsData.perform()
    }

    private updateMvpMatrix() {
        this.renderingUniformsData.splice(0, 16, ...this.mvpMatrix())
        this.updateRenderingUniformsData.perform()
    }

    private mvpMatrix() {
        return ether.mat4.columnMajorArray(ether.mat4.mul(
            ether.mat4.mul(this._projectionMatrix, this._viewMatrix),
            this._modelMatrix
        ))
    }

    private createPipeline(shaderModule: gpu.ShaderModule, canvas: gpu.Canvas, mesh: geo.Mesh): GPURenderPipeline {
        return shaderModule.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [
                this.bodyDesc.asBufferLayout('instance'),
                this.bodyPosition.asBufferLayout('instance'),
                this.bodySurfaceVertex.asBufferLayout('vertex')
            ]),
            fragment: shaderModule.fragmentState("f_main", [canvas]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: mesh.topology,
                stripIndexFormat: mesh.indexFormat,
            },
            multisample: {
                count: canvas.sampleCount
            }
        })
    }

    render(universe: Universe) {
        const descriptor: GPURenderPassDescriptor = {
            colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
            depthStencilAttachment: this.depthTexture.depthAttachment()
        }
        this.device.enqueueCommand(encoder => {
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.renderPipeline)
                pass.setBindGroup(0, this.renderBindGroup)
                pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer)
                pass.setVertexBuffer(1, universe.currentState.buffer)
                pass.setVertexBuffer(2, this.meshVertexBuffer.buffer)
                pass.setIndexBuffer(this.meshIndicesBuffer.buffer, this.meshIndexFormat)
                pass.drawIndexed(this.meshSize, universe.bodiesCount, 0, 0)
            })
        })
    }

}

export async function newRenderer(device: gpu.Device, canvas: gpu.Canvas) {
    const shaderModule = await device.loadShaderModule("gravity-render.wgsl")
    return new Renderer(device, canvas, shaderModule)
}
