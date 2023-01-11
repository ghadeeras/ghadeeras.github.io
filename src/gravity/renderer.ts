import { aether } from '/gen/libs.js'
import * as gpu from '../djee/gpu/index.js'
import * as geo from './geo.js'
import { Universe } from './universe.js'
import { CanvasSizeManager } from '../utils/gear.js'
import { PerspectiveProjection } from '/aether/latest/index.js'

const projection = new PerspectiveProjection(1, null, false, false)

export class Renderer {

    private bodyDesc = gpu.vertex({
        massAndRadius: gpu.f32.x2
    })  

    private bodyPosition = Universe.bodyState.asVertex(['position'])

    private bodySurfaceVertex = gpu.vertex({
        position: gpu.f32.x3
    })

    private readonly pipeline: GPURenderPipeline
    
    private readonly meshIndexFormat: GPUIndexFormat
    private readonly meshSize: number

    private readonly uniformsBuffer: gpu.SyncBuffer
    private readonly meshIndicesBuffer: gpu.Buffer
    private readonly meshVerticesBuffer: gpu.Buffer

    private readonly bindGroup: GPUBindGroup

    private depthTexture: gpu.Texture

    private _zoom = 1
    private _aspectRatio = 1
    private _viewMatrix = aether.mat4.lookAt([0, 0, -24])
    private _modelMatrix = aether.mat4.identity()

    private readonly uniformsStruct = gpu.struct({
        mvpMatrix: gpu.f32.x4.x4,
        mMatrix: gpu.f32.x4.x4,
        radiusScale: gpu.f32,
    })

    constructor(private device: gpu.Device, private canvas: gpu.Canvas, renderShader: gpu.ShaderModule) {
        const mesh = geo.sphere(18, 9)
        this.meshIndexFormat = mesh.indexFormat ?? "uint16"
        this.meshSize = mesh.indices.length

        this.depthTexture = canvas.depthTexture()
        const sizeManager = new CanvasSizeManager(true)
        sizeManager.observe(canvas.element, () => this.resize())
        this._aspectRatio = canvas.element.width / canvas.element.height
    
        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader, canvas, mesh)
        const bindGroupLayout = this.pipeline.getBindGroupLayout(0)

        /* Buffers */
        this.uniformsBuffer = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.view([{
            mvpMatrix: this.mvpMatrix,
            mMatrix: this.modelMatrix,
            radiusScale: 0.06
        }]))
        this.meshIndicesBuffer = device.buffer("indices", GPUBufferUsage.INDEX, gpu.dataView(new Uint16Array(mesh.indices)))
        this.meshVerticesBuffer = device.buffer("vertices", GPUBufferUsage.VERTEX, gpu.dataView(new Float32Array(mesh.positions)))

        /* Bind Groups */
        this.bindGroup = this.device.bindGroup(bindGroupLayout, [this.uniformsBuffer])
    }

    get zoom() {
        return this._zoom
    }

    set zoom(z: number) {
        this._zoom = z
        this.updateMvpMatrix()
    }

    get aspectRatio() {
        return this._aspectRatio
    }

    set aspectRatio(r: number) {
        this._aspectRatio = r
        this.updateMvpMatrix()
    }

    get viewMatrix() {
        return this._viewMatrix
    }

    set viewMatrix(m: aether.Mat<4>) {
        this._viewMatrix = m
        this.updateMvpMatrix()
    }

    get modelMatrix() {
        return this._modelMatrix
    }

    set modelMatrix(m: aether.Mat<4>) {
        this._modelMatrix = m
        this.updateMvpMatrix()
    }

    get radiusScale() {
        return this.uniformsBuffer.get(this.uniformsStruct.members.radiusScale)
    }

    set radiusScale(v: number) {
        this.uniformsBuffer.set(this.uniformsStruct.members.radiusScale, v)
    }

    get mvpMatrix() {
        return aether.mat4.mul(
            this.projectionViewMatrix,
            this._modelMatrix
        )
    }

    get projectionViewMatrix(): aether.Mat4 {
        return aether.mat4.mul(
            projection.matrix(this.zoom, this.aspectRatio),
            this.viewMatrix
        )
    }

    private updateMvpMatrix() {
        this.uniformsBuffer.set(this.uniformsStruct.members.mvpMatrix, this.mvpMatrix)
        this.uniformsBuffer.set(this.uniformsStruct.members.mMatrix, this.modelMatrix)
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
            },
            layout: "auto"
        })
    }

    resize() {
        this.canvas.resize()
        this.depthTexture.resize(this.canvas.size)
        this.aspectRatio = this.canvas.element.width / this.canvas.element.height
    }

    render(universe: Universe) {
        const descriptor: GPURenderPassDescriptor = {
            colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
            depthStencilAttachment: this.depthTexture.createView().depthAttachment()
        }
        this.device.enqueueCommand("render", encoder => {
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.bindGroup)
                pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer)
                pass.setVertexBuffer(1, universe.currentState.buffer)
                pass.setVertexBuffer(2, this.meshVerticesBuffer.buffer)
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
