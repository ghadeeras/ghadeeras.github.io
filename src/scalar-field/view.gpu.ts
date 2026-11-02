import type { Mat4, Vec4 } from "aether"
import { mat4, PerspectiveProjection, vec4 } from "aether"
import * as gpu from "lumen"
import { glWebGPU } from "webgxx"
import { picker, pickerGL } from "./picker.gpu.js"
import * as v from "./view.js"

const projection = new PerspectiveProjection(1, null, false, false)

export class GPUView implements v.View {

    private gpuCanvas: gpu.Canvas
    private depthTexture: gpu.Texture
    private uniforms: gpu.SyncBuffer
    private vertices: gpu.DataBuffer
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
        backgroundColor: gpu.f32.x4,
        lightPos: gpu.f32.x4,
        shininess: gpu.f32,
        lightRadius: gpu.f32,
        fogginess: gpu.f32,
    })

    private _matPositions: Mat4 = mat4.identity()
    private _matNormals: Mat4 = mat4.identity()
    private _matView: Mat4 = mat4.identity()
    private _lightPosition: Vec4 = [2, 2, 2, 1]

    private _focalLength = 2
    private _aspectRatio = 1
    private _size = 0

    constructor(
        private device: gpu.Device,
        canvasId: string,
        vertexShaderModule: gpu.ShaderModule,
        fragmentShaderModule: gpu.ShaderModule,
    ) {
        this.uniforms = device.syncBuffer({
            label: "uniforms",
            usage: ["UNIFORM"], 
            size: this.uniformsStruct.paddedSize
        });
        this.vertices = device.dataBuffer({
            label: "vertices",
            usage: ["VERTEX"], 
            size: GPUView.vertex.struct.stride
        })
        this._size = this.vertices.size / GPUView.vertex.struct.stride

        this.gpuCanvas = device.canvas(canvasId, 4)
        this.depthTexture = this.gpuCanvas.depthTexture()

        this.pipeline = device.wrapped.createRenderPipeline({
            vertex: vertexShaderModule.vertexState("v_main", [GPUView.vertex.asBufferLayout()]),
            fragment: fragmentShaderModule.fragmentState("f_main", [this.gpuCanvas]),
            depthStencil : this.depthTexture.depthState(),
            primitive: {
                topology: "triangle-list",
            },
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
            layout: "auto"
        })

        this.uniformsGroup = device.wrapped.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0), 
            entries: [{
                binding: 0,
                resource: this.uniforms.asBindingResource()
            }]
        });
    }

    async picker(): Promise<v.Picker> {
        return this.device.wrapped.adapterInfo.architecture === "WebGL2" ? await pickerGL(this.gpuCanvas, () => this.vertices) : await picker(this.gpuCanvas, () => this.vertices)  
    }

    resize() {
        this._aspectRatio = this.gpuCanvas.element.width / this.gpuCanvas.element.height
        this.matProjection = projection.matrix(this._focalLength, this._aspectRatio)
        this.gpuCanvas.resize()
        this.depthTexture.size = this.gpuCanvas.size
    }

    render() {
        this.device.enqueueCommands("render", encoder => {
            const [r, g, b, a] = this.backgroundColor
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r, g, b, a })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setVertexBuffer(0, this.vertices.wrapped)
                pass.setBindGroup(0, this.uniformsGroup)
                pass.draw(this._size)
            })
        })
    }

    setMatModel(modelPositions: Mat4, modelNormals: Mat4 = mat4.comatrix(modelPositions)) {
        this._matPositions = modelPositions
        this._matNormals = modelNormals

        const matPositions = mat4.mul(this.matView, modelPositions)
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            mat4.mul(this.matView, modelNormals)

        this.uniforms.set(this.uniformsStruct.members.mat, {
            positions: matPositions,
            normals: matNormals
        })
    }

    setMesh(_primitives: GLenum, vertices: Float32Array) {
        this.vertices.setData(gpu.dataView(vertices))
        this._size = vertices.length / 6
    }

    get canvas(): HTMLCanvasElement {
        return this.gpuCanvas.element
    }

    get matPositions(): Mat4 {
        return this._matPositions
    }

    get matNormals(): Mat4 {
        return this._matNormals
    }

    get matView(): Mat4 {
        return this._matView
    }    

    set matView(m: Mat4) {
        this._matView = m
        this.lightPosition = this._lightPosition
    }    

    get focalLength() {
        return this._focalLength
    }

    set focalLength(l: number) {
        this._focalLength = l
        this.matProjection = projection.matrix(this._focalLength, this._aspectRatio)
    }

    get matProjection(): Mat4 {
        return this.uniforms.get(this.uniformsStruct.members.projectionMat)
    }

    private set matProjection(m: Mat4) {
        this.uniforms.set(this.uniformsStruct.members.projectionMat, m)
    }

    get color(): Vec4 {
        return this.uniforms.get(this.uniformsStruct.members.color)
    }

    set color(c: Vec4) {
        this.uniforms.set(this.uniformsStruct.members.color, c)
    }

    get backgroundColor(): Vec4 {
        return this.uniforms.get(this.uniformsStruct.members.backgroundColor)
    }

    set backgroundColor(c: Vec4) {
        this.uniforms.set(this.uniformsStruct.members.backgroundColor, c)
    }

    get lightPosition(): Vec4 {
        return this._lightPosition
    }

    set lightPosition(p: Vec4) {
        this._lightPosition = p
        this.uniforms.set(this.uniformsStruct.members.lightPos, vec4.add(this._matView[3], p))
    }

    get shininess(): number {
        return this.uniforms.get(this.uniformsStruct.members.shininess)
    }

    set shininess(s: number) {
        this.uniforms.set(this.uniformsStruct.members.shininess, s)
    }

    get lightRadius(): number {
        return this.uniforms.get(this.uniformsStruct.members.lightRadius)
    }

    set lightRadius(r: number) {
        this.uniforms.set(this.uniformsStruct.members.lightRadius, r)
    }

    get fogginess(): number {
        return this.uniforms.get(this.uniformsStruct.members.fogginess)
    }

    set fogginess(f: number) {
        this.uniforms.set(this.uniformsStruct.members.fogginess, f)
    }

}

export async function newView(canvasId: string): Promise<v.View> {
    const device = await gpu.Device.instance()
    const shaderModule = await device.shaderModule({ path: "shaders/generic.wgsl" })
    return new GPUView(device, canvasId, shaderModule, shaderModule)
}

export async function newGLView(canvasId: string): Promise<v.View> {
    const device = await gpu.Device.instance({}, glWebGPU(document.getElementById(canvasId) as HTMLCanvasElement))
    const vertexShaderModule = await device.shaderModule({ path: "shaders/generic.vert" })
    const fragmentShaderModule = await device.shaderModule({ path: "shaders/generic.frag" })
    return new GPUView(device, canvasId, vertexShaderModule, fragmentShaderModule)
}
