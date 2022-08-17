import { aether } from "/gen/libs.js"
import * as gpu from "../djee/gpu/index.js"
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

    private readonly uniformsStruct = gpu.struct({
        mat: gpu.struct({
            positions: gpu.mat4x4,
            normals: gpu.mat4x4,
        }),
        projectionMat: gpu.mat4x4,
        color: gpu.f32.x4,
        lightPos: gpu.f32.x4,
        shininess: gpu.f32,
        lightRadius: gpu.f32,
        fogginess: gpu.f32,
    })

    private uniformsView: DataView = this.uniformsStruct.view()

    private frame: () => void

    private _matPositions: aether.Mat<4> = aether.mat4.identity()
    private _matNormals: aether.Mat<4> = aether.mat4.identity()
    private _matView: aether.Mat<4> = aether.mat4.identity()
    private _lightPosition: aether.Vec<4> = [2, 2, 2, 1]

    constructor(
        private device: gpu.Device,
        canvasId: string,
        shaderModule: gpu.ShaderModule,
    ) {
        this.uniforms = device.buffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsView);
        this.vertices = device.buffer("vertices", GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, GPUView.vertex.struct.stride)

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
            },
            layout: "auto"
        })

        this.uniformsGroup = device.bindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms]);

        this.frame = () => {
            this.draw()
            requestAnimationFrame(this.frame)
        }
        this.frame()
    }

    get matPositions(): aether.Mat<4> {
        return this._matPositions
    }

    get matNormals(): aether.Mat<4> {
        return this._matNormals
    }

    get matView(): aether.Mat<4> {
        return this._matView
    }    

    set matView(m: aether.Mat<4>) {
        this._matView = m
        this.lightPosition = this._lightPosition
    }    

    setMatModel(modelPositions: aether.Mat<4>, modelNormals: aether.Mat<4> = aether.mat4.transpose(aether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions
        this._matNormals = modelNormals

        const matPositions = aether.mat4.mul(this.matView, modelPositions)
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            aether.mat4.mul(this.matView, modelNormals)

        this.setMember(this.uniformsStruct.members.mat, {
            positions: matPositions,
            normals: matNormals
        })
    }

    get matProjection(): aether.Mat<4> {
        return this.getMember(this.uniformsStruct.members.projectionMat)
    }

    set matProjection(m: aether.Mat<4>) {
        this.setMember(this.uniformsStruct.members.projectionMat, m)
    }

    get color(): aether.Vec<4> {
        return this.getMember(this.uniformsStruct.members.color)
    }

    set color(c: aether.Vec<4>) {
        this.setMember(this.uniformsStruct.members.color, c)
    }

    get lightPosition(): aether.Vec<4> {
        return this._lightPosition
    }

    set lightPosition(p: aether.Vec<4>) {
        this._lightPosition = p
        this.setMember(this.uniformsStruct.members.lightPos, aether.vec4.add(this._matView[3], p))
    }

    get shininess(): number {
        return this.getMember(this.uniformsStruct.members.shininess)
    }

    set shininess(s: number) {
        this.setMember(this.uniformsStruct.members.shininess, s)
    }

    get lightRadius(): number {
        return this.getMember(this.uniformsStruct.members.lightRadius)
    }

    set lightRadius(r: number) {
        this.setMember(this.uniformsStruct.members.lightRadius, r)
    }

    get fogginess(): number {
        return this.getMember(this.uniformsStruct.members.fogginess)
    }

    set fogginess(f: number) {
        this.setMember(this.uniformsStruct.members.fogginess, f)
    }

    private getMember<T>(member: gpu.Element<T>): T {
        return member.read(this.uniformsView)
    }

    private setMember<T>(member: gpu.Element<T>, value: T) {
        member.write(this.uniformsView, value)
        this.uniforms.syncFrom(this.uniformsView, member)
    }

    setMesh(_primitives: GLenum, vertices: Float32Array) {
        this.vertices.setData(gpu.dataView(vertices))
    }

    async picker(): Promise<v.Picker> {
        return await picker(this.canvas, () => this.vertices)  
    }

    private draw() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment()
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
