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

    constructor(
        private device: gpu.Device,
        canvasId: string,
        shaderModule: gpu.ShaderModule,
    ) {
        this.uniforms = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, this.uniformsData);
        this.vertices = device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, 6 * 4, new Float32Array([]))

        this.canvas = device.canvas(canvasId)
        this.depthTexture = this.canvas.depthTexture()

        this.pipeline = device.device.createRenderPipeline({
            vertex: {
                module: shaderModule.shaderModule,
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

        const matPositions = ether.mat4.columnMajorArray(ether.mat4.mul(this.matView, modelPositions))
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            ether.mat4.columnMajorArray(ether.mat4.mul(this.matView, modelNormals))

        this.uniformsData.set(matPositions, 0)
        this.uniformsData.set(matNormals, 16)
        this.uniforms.writeAt(0, this.uniformsData, 0, 32)
    }

    get matProjection(): ether.Mat<4> {
        return ether.mat4.from(this.uniformsData, 32)
    }

    set matProjection(m: ether.Mat<4>) {
        this.uniformsData.set(ether.mat4.columnMajorArray(m), 32)
        this.uniforms.writeAt(32 * 4, this.uniformsData, 32, 16)
    }

    get color(): ether.Vec<4> {
        return ether.vec4.from(this.uniformsData, 48)
    }

    set color(c: ether.Vec<4>) {
        this.uniformsData.set(c, 48)
        this.uniforms.writeAt(48 * 4, this.uniformsData, 48, 4)
    }

    get lightPosition(): ether.Vec<4> {
        return this._lightPosition
    }

    set lightPosition(p: ether.Vec<4>) {
        this._lightPosition = p
        this.uniformsData.set(ether.vec4.add(this._matView[3], p), 52)
        this.uniforms.writeAt(52 * 4, this.uniformsData, 52, 4)
    }

    get shininess(): number {
        return this.uniformsData[56]
    }

    set shininess(s: number) {
        this.uniformsData[56] = s
        this.uniforms.writeAt(56 * 4, this.uniformsData, 56, 1)
    }

    get lightRadius(): number {
        return this.uniformsData[57]
    }

    set lightRadius(s: number) {
        this.uniformsData[57] = s
        this.uniforms.writeAt(57 * 4, this.uniformsData, 57, 1)
    }

    get fogginess(): number {
        return this.uniformsData[58]
    }

    set fogginess(f: number) {
        this.uniformsData[58] = f
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
