import { aether, gear } from '/gen/libs.js'
import * as gpu from '../djee/gpu/index.js'
import * as geo from './geo.js'
import { Universe } from './universe.js'

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

    private readonly depthTexture: gpu.Texture

    private readonly uniformsBuffer: gpu.Buffer
    private readonly meshIndicesBuffer: gpu.Buffer
    private readonly meshVertexBuffer: gpu.Buffer

    private readonly bindGroup: GPUBindGroup

    private _projectionMatrix = aether.mat4.projection(1)
    private _viewMatrix = aether.mat4.lookAt([0, 0, -24])
    private _modelMatrix = aether.mat4.identity()

    private readonly uniformsStruct = gpu.struct({
        mvpMatrix: gpu.f32.x4.x4,
        mMatrix: gpu.f32.x4.x4,
        radiusScale: gpu.f32,
    })

    private readonly uniformsView = this.uniformsStruct.view([{
        mvpMatrix: this.mvpMatrix(),
        mMatrix: this.mMatrix(),
        radiusScale: 0.06
    }])

    private updateUniformsData = new gear.DeferredComputation(() => {
        this.uniformsBuffer.writeAt(0, this.uniformsView)
    })

    constructor(private device: gpu.Device, private canvas: gpu.Canvas, renderShader: gpu.ShaderModule) {
        const mesh = geo.sphere(18, 9)
        this.meshIndexFormat = mesh.indexFormat ?? "uint16"
        this.meshSize = mesh.indices.length

        this.depthTexture = canvas.depthTexture()

        /* Pipeline */
        this.pipeline = this.createPipeline(renderShader, canvas, mesh)
        const bindGroupLayout = this.pipeline.getBindGroupLayout(0)

        /* Buffers */
        this.uniformsBuffer = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsView)
        this.meshIndicesBuffer = device.buffer(GPUBufferUsage.INDEX, gpu.dataView(new Uint16Array(mesh.indices)))
        this.meshVertexBuffer = device.buffer(GPUBufferUsage.VERTEX, gpu.dataView(new Float32Array(mesh.positions)))

        /* Bind Groups */
        this.bindGroup = this.device.createBindGroup(bindGroupLayout, [this.uniformsBuffer])
    }

    get projectionViewMatrix() {
        return aether.mat4.mul(
            this.projectionMatrix,
            this.viewMatrix
        )
    }

    get projectionMatrix() {
        return this._projectionMatrix
    }

    set projectionMatrix(m: aether.Mat<4>) {
        this._projectionMatrix = m
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
        return this.getMember(this.uniformsStruct.members.radiusScale)
    }

    set radiusScale(v: number) {
        this.setMember(this.uniformsStruct.members.radiusScale, v)
    }

    private updateMvpMatrix() {
        this.setMember(this.uniformsStruct.members.mvpMatrix, this.mvpMatrix())
        this.setMember(this.uniformsStruct.members.mMatrix, this.mMatrix())
    }

    private getMember<T>(member: gpu.Element<T>): T {
        return member.read(this.uniformsView)
    }

    private setMember<T>(member: gpu.Element<T>, value: T) {
        member.write(this.uniformsView, value)
        this.updateUniformsData.perform()
    }

    private mvpMatrix() {
        return aether.mat4.mul(
            aether.mat4.mul(this._projectionMatrix, this._viewMatrix),
            this._modelMatrix
        )
    }

    private mMatrix() {
        return this._modelMatrix
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
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.bindGroup)
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
