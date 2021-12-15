import * as gpu from "../djee/gpu/index.js"
import * as ether from "../../ether/latest/index.js"
import * as v from "./view.js"
import { picker } from "./picker.gpu.js"

export class GPUView implements v.View {

    private canvas: gpu.Canvas
    private depthTexture: gpu.Texture
    private uniforms: gpu.Buffer
    private vertices: gpu.Buffer
    private pipeline: GPURenderPipeline
    private uniformsGroup: GPUBindGroup

    static readonly vertex = gpu.vertex({
        position: gpu.f32.x3,
        normal: gpu.f32.x3,
    })

    private uniformsStruct = gpu.struct({
        positionsMat: gpu.mat4x4,
        normalsMat: gpu.mat4x4,
        projectionMat: gpu.mat4x4,
        color: gpu.f32.x4,
        lightPos: gpu.f32.x4,
        shininess: gpu.f32,
        lightRadius: gpu.f32,
        fogginess: gpu.f32,
    })

    private uniformsData: Float32Array = new Float32Array(this.uniformsStruct.paddedSize / Float32Array.BYTES_PER_ELEMENT)
    private uniformsView: DataView = new DataView(this.uniformsData.buffer)

    private frame: () => void

    private _matPositions: ether.Mat<4> = ether.mat4.identity()
    private _matNormals: ether.Mat<4> = ether.mat4.identity()
    private _matView: ether.Mat<4> = ether.mat4.identity()
    private _lightPosition: ether.Vec<4> = [2, 2, 2, 1]

    constructor(
        private device: gpu.Device,
        canvasId: string,
        shaderModule: gpu.ShaderModule,
    ) {
        this.uniforms = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, this.uniformsData);
        this.vertices = device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, GPUView.vertex.struct.stride, new Float32Array([]))

        this.canvas = device.canvas(canvasId)
        this.depthTexture = this.canvas.depthTexture()

        this.pipeline = device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [GPUView.vertex.asBufferLayout()]),
            fragment: shaderModule.fragmentState("f_main", [this.canvas]),
            depthStencil : this.depthTexture.depthState(),
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: this.canvas.sampleCount
            }
        })

        this.uniformsGroup = device.createBindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms]);

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

        const matPositions = ether.mat4.mul(this.matView, modelPositions)
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            ether.mat4.mul(this.matView, modelNormals)

        this.uniformsStruct.members.positionsMat.write(this.uniformsView, 0, matPositions)
        this.uniformsStruct.members.normalsMat.write(this.uniformsView, 0, matNormals)
        this.uniforms.writeAt(0, this.uniformsData, 0, 32)
    }

    get matProjection(): ether.Mat<4> {
        return this.uniformsStruct.members.projectionMat.read(this.uniformsView, 0)
    }

    set matProjection(m: ether.Mat<4>) {
        this.uniformsStruct.members.projectionMat.write(this.uniformsView, 0, m)
        this.uniforms.writeAt(32 * 4, this.uniformsData, 32, 16)
    }

    get color(): ether.Vec<4> {
        return this.uniformsStruct.members.color.read(this.uniformsView, 0)
    }

    set color(c: ether.Vec<4>) {
        this.uniformsStruct.members.color.write(this.uniformsView, 0, c)
        this.uniforms.writeAt(48 * 4, this.uniformsData, 48, 4)
    }

    get lightPosition(): ether.Vec<4> {
        return this._lightPosition
    }

    set lightPosition(p: ether.Vec<4>) {
        this._lightPosition = p
        this.uniformsStruct.members.lightPos.write(this.uniformsView, 0, ether.vec4.add(this._matView[3], p))
        this.uniforms.writeAt(52 * 4, this.uniformsData, 52, 4)
    }

    get shininess(): number {
        return this.uniformsStruct.members.shininess.read(this.uniformsView, 0)
    }

    set shininess(s: number) {
        this.uniformsStruct.members.shininess.write(this.uniformsView, 0, s)
        this.uniforms.writeAt(56 * 4, this.uniformsData, 56, 1)
    }

    get lightRadius(): number {
        return this.uniformsStruct.members.lightRadius.read(this.uniformsView, 0)
    }

    set lightRadius(r: number) {
        this.uniformsStruct.members.lightRadius.write(this.uniformsView, 0, r)
        this.uniforms.writeAt(57 * 4, this.uniformsData, 57, 1)
    }

    get fogginess(): number {
        return this.uniformsStruct.members.fogginess.read(this.uniformsView, 0)
    }

    set fogginess(f: number) {
        this.uniformsStruct.members.fogginess.write(this.uniformsView, 0, f)
        this.uniforms.writeAt(58 * 4, this.uniformsData, 58, 1)
    }

    setMesh(primitives: GLenum, vertices: Float32Array) {
        this.vertices.setData(vertices)
    }

    async picker(): Promise<v.Picker> {
        return await picker(this.canvas, () => this.vertices)  
    }

    private draw() {
        this.device.enqueueCommand(encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setVertexBuffer(0, this.vertices.buffer)
                pass.setBindGroup(0, this.uniformsGroup)
                pass.draw(this.vertices.stridesCount)
            })
        })
    }

}

export async function newView(canvasId: string): Promise<v.View> {
    const device = await gpu.Device.instance()
    const shaderModule = await device.loadShaderModule("generic.wgsl")
    return new GPUView(device, canvasId, shaderModule)
}
