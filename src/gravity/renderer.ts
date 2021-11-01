import * as ether from '../../ether/latest/index.js' 
import * as gpu from '../djee/gpu/index.js'
import * as geo from './geo.js'
import { DeferredComputation } from '../../gear/latest/scheduling.js'
import { Universe } from './universe.js'

export class Renderer {

    private readonly renderPipeline: GPURenderPipeline
    
    private readonly meshIndexFormat: GPUIndexFormat
    private readonly meshSize: number

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

    constructor(private device: gpu.Device, renderShader: gpu.ShaderModule, canvas: gpu.Canvas) {
        const mesh = geo.sphere(18, 9)
        this.meshIndexFormat = mesh.indexFormat ?? "uint16"
        this.meshSize = mesh.indices.length

        /* Pipeline */
        this.renderPipeline = this.createPipeline(device.device, renderShader.shaderModule, canvas.format, mesh, canvas.sampleCount)
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

    private createPipeline(device: GPUDevice, shaderModule: GPUShaderModule, colorFormat: GPUTextureFormat, mesh: geo.Mesh, sampleCount: number | undefined): GPURenderPipeline {
        return device.createRenderPipeline({
            vertex: {
                entryPoint: "v_main",
                module: shaderModule,
                buffers: [
                    {
                        arrayStride: 2 * 4,
                        attributes: [{
                            offset: 0,
                            format: 'float32x2',
                            shaderLocation: 0,
                        }],
                        stepMode: 'instance',
                    },
                    {
                        arrayStride: 8 * 4,
                        attributes: [{
                            offset: 0,
                            format: 'float32x3',
                            shaderLocation: 1,
                        }],
                        stepMode: 'instance',
                    },
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                            offset: 0,
                            format: 'float32x3',
                            shaderLocation: 2,
                        }],
                        stepMode: 'vertex',
                    }
                ]
            },
            fragment: {
                entryPoint: "f_main",
                module: shaderModule,
                targets: [
                    {
                        format: colorFormat
                    }
                ],
            },
            depthStencil: {
                format: "depth32float",
                depthCompare: 'less',
                depthWriteEnabled: true,
            },
            primitive: {
                topology: mesh.topology,
                stripIndexFormat: mesh.indexFormat,
            },
            multisample: {
                count: sampleCount
            }
        })
    }

    render(universe: Universe, descriptor: GPURenderPassDescriptor) {
        this.device.device.queue.submit([
            this.device.encodeCommand(encoder => {
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
        ])
    }

}

export async function newRenderer(device: gpu.Device, canvas: gpu.Canvas) {
    const shaderModule = await device.loadShaderModule("gravity-render.wgsl")
    return new Renderer(device, shaderModule, canvas)
}
