import * as ether from "../../ether/latest/index.js"
import * as etherX from "../utils/ether.js"
import * as v from "./view.js"
import * as gputils from "../djee/gpu/utils.js"
import { Canvas } from "../djee/gpu/canvas.js"

export class GPUView implements v.View {

    private canvas: Canvas
    private depthTexture: GPUTexture
    private uniforms: GPUBuffer
    private pipeline: GPURenderPipeline
    private uniformsGroup: GPUBindGroup

    private uniformsData: Float32Array = new Float32Array([
        ...ether.mat4.columnMajorArray(ether.mat4.identity()),
        ...ether.mat4.columnMajorArray(ether.mat4.identity()),
        ...ether.mat4.columnMajorArray(ether.mat4.identity()),
        1, 1, 1, 1,
        2, 2, 2, 1,
        0,
        0.1,
        0,
        // padding
        0
    ])

    private frame: () => void

    private _matPositions: ether.Mat<4> = ether.mat4.identity()
    private _matNormals: ether.Mat<4> = ether.mat4.identity()
    private _matView: ether.Mat<4> = ether.mat4.identity()
    private _lightPosition: ether.Vec<4> = [2, 2, 2, 1]

    private vertices: GPUBuffer
    private verticesCount: number = 0
    private maxVerticesCount: number = 0

    constructor(
        private device: GPUDevice,
        adapter: GPUAdapter,
        canvasId: string,
        shaderModule: GPUShaderModule,
    ) {
        this.uniforms = gputils.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsData);
        this.vertices = gputils.createBuffer(device, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array([]))

        this.canvas = new Canvas(canvasId, device, adapter)
        this.depthTexture = this.canvas.depthTexture()

        this.pipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "v_main",
                buffers: [{
                    arrayStride: 6 * 4,
                    attributes: [{
                        shaderLocation: 0,
                        format: "float32x3",
                        offset: 0
                    }, {
                        shaderLocation: 1,
                        format: "float32x3",
                        offset: 12
                    }]
                }]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "f_main",
                targets: [{
                    format: this.canvas.format
                }]
            },
            depthStencil : {
                format: "depth32float",
                depthWriteEnabled: true,
                depthCompare: "less"
            },
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: this.canvas.sampleCount
            }
        })

        this.uniformsGroup = gputils.createBindGroup(device, this.pipeline.getBindGroupLayout(0), [this.uniforms]);

        this.frame = () => {
            this.draw()
            requestAnimationFrame(this.frame)
        }
        this.frame()
    }

    get matPositions(): ether.Mat<4> {
        return this._matPositions
    }

    get matNormals(): ether.Mat<4> {
        return this._matNormals
    }

    get matView(): ether.Mat<4> {
        return this._matView
    }    

    set matView(m: ether.Mat<4>) {
        this._matView = m
        this.lightPosition = this._lightPosition
    }    

    setMatModel(modelPositions: ether.Mat<4>, modelNormals: ether.Mat<4> = ether.mat4.transpose(ether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions
        this._matNormals = modelNormals

        const matPositions = ether.mat4.columnMajorArray(ether.mat4.mul(this.matView, modelPositions))
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            ether.mat4.columnMajorArray(ether.mat4.mul(this.matView, modelNormals))

        this.uniformsData.set(matPositions, 0)
        this.uniformsData.set(matNormals, 16)
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 32, 0)
    }

    get matProjection(): ether.Mat<4> {
        return etherX.asMat(this.uniformsData, 32)
    }

    set matProjection(m: ether.Mat<4>) {
        this.uniformsData.set(ether.mat4.columnMajorArray(m), 32)
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 16, 32)
    }

    get color(): ether.Vec<4> {
        return etherX.asVec(this.uniformsData, 48)
    }

    set color(c: ether.Vec<4>) {
        this.uniformsData.set(c, 48)
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 4, 48)
    }

    get lightPosition(): ether.Vec<4> {
        return this._lightPosition
    }

    set lightPosition(p: ether.Vec<4>) {
        this._lightPosition = p
        const vp = ether.mat4.apply(this._matView, p)
        this.uniformsData.set(vp, 52)
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 4, 52)
    }

    get shininess(): number {
        return this.uniformsData[56]
    }

    set shininess(s: number) {
        this.uniformsData[56] = s
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 1, 56)
    }

    get lightRadius(): number {
        return this.uniformsData[57]
    }

    set lightRadius(s: number) {
        this.uniformsData[57] = s
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 1, 57)
    }

    get fogginess(): number {
        return this.uniformsData[58]
    }

    set fogginess(f: number) {
        this.uniformsData[58] = f
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 1, 58)
    }

    setMesh(primitives: GLenum, vertices: Float32Array) {
        this.verticesCount = vertices.length / 6
        if (this.verticesCount > this.maxVerticesCount) {
            this.vertices.destroy()
            this.vertices = gputils.createBuffer(this.device, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, vertices)
            this.maxVerticesCount = this.verticesCount
        } else {
            this.device.queue.writeBuffer(this.vertices, 0, vertices)
        }
    }

    private draw() {
        const command = gputils.encodeCommand(this.device, encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: gputils.depthAttachment(this.depthTexture)
            };
            gputils.renderPass(encoder, passDescriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setVertexBuffer(0, this.vertices)
                pass.setBindGroup(0, this.uniformsGroup)
                pass.draw(this.verticesCount)
            })
        })
        this.device.queue.submit([command])
    }

}

export async function newView(canvasId: string): Promise<v.View> {
    const [device, adapter] = await gputils.gpuObjects()
    const shaderModule = await gputils.loadShaderModule(device, "generic.wgsl")
    return new GPUView(device, adapter, canvasId, shaderModule)
}
