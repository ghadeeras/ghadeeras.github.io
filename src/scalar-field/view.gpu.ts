import * as gear from "../../gear/latest/files.js"
import * as ether from "../../ether/latest/index.js"
import * as v from "./view.js"

export class GPUView implements v.View {

    private context: GPUCanvasContext
    private colorView: GPUTextureView
    private depthView: GPUTextureView
    private uniforms: GPUBuffer
    private vertices: GPUBuffer
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
        0
    ])

    private _frame: null | (() => void) = null
    private _next: null | GPUBuffer = null
    private _nextCount: number = 0

    private _matPositions: ether.Mat<4> = ether.mat4.identity()
    private _matNormals: ether.Mat<4> = ether.mat4.identity()
    private _matView: ether.Mat<4> = ether.mat4.identity()
    private _globalLightPosition: ether.Vec<4> = [2, 2, 2, 1]
    private _verticesCount: number = 0

    constructor(
        private device: GPUDevice,
        adapter: GPUAdapter,
        canvasId: string,
        shaderCode: string,
    ) {
        this.uniforms = GPUView.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsData);
        this.vertices = GPUView.createBuffer(device, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array([]))

        const canvas = document.getElementById(canvasId) as HTMLCanvasElement
        this.context = v.required(canvas.getContext("webgpu") ?? canvas.getContext("gpupresent"))

        const colorFormat: GPUTextureFormat = this.context.getPreferredFormat(adapter)
        const pixelRatio = window.devicePixelRatio || 1
        const sampleCount = Math.pow(Math.ceil(pixelRatio), 2)
        const size = {
            width: canvas.clientWidth * pixelRatio,
            height: canvas.clientHeight * pixelRatio
        }

        this.context.configure({
            device: device,
            format: colorFormat,
            size: size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        })

        const colorTexture = device.createTexture({
            format: colorFormat,
            size: size,
            sampleCount: sampleCount,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        })
        this.colorView = colorTexture.createView()

        const depthTexture = device.createTexture({
            format: "depth24plus",
            size: size,
            sampleCount: sampleCount,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        })
        this.depthView = depthTexture.createView()

        const shaderModule = device.createShaderModule({ code: shaderCode });
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
                    format: colorFormat
                }]
            },
            depthStencil : {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            },
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: sampleCount
            }
        })

        this.uniformsGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                resource: { buffer: this.uniforms },
                binding: 0
            }]
        });
    }

    private static createBuffer(device: GPUDevice, usage: GPUBufferUsageFlags, data: ArrayLike<number> & ArrayBufferView) {
        const buffer = device.createBuffer({
            size: data.byteLength,
            usage: usage,
            mappedAtCreation: true
        });
        const array = new Float32Array(buffer.getMappedRange());
        array.set(data);
        buffer.unmap();
        return buffer;
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
        this.lightPosition = this._globalLightPosition
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
        this.device.queue.writeBuffer(this.uniforms, 0, this.uniformsData, 0, 32)
    }

    get matProjection(): ether.Mat<4> {
        return v.asMat(this.uniformsData, 32)
    }

    set matProjection(m: ether.Mat<4>) {
        this.uniformsData.set(ether.mat4.columnMajorArray(m), 32)
        this.device.queue.writeBuffer(this.uniforms, 32 * 4, this.uniformsData, 32, 16)
    }

    get color(): ether.Vec<4> {
        return v.asVec(this.uniformsData, 48)
    }

    set color(c: ether.Vec<4>) {
        this.uniformsData.set(c, 48)
        this.device.queue.writeBuffer(this.uniforms, 48 * 4, this.uniformsData, 48, 4)
    }

    get lightPosition(): ether.Vec<4> {
        return this._globalLightPosition
    }

    set lightPosition(p: ether.Vec<4>) {
        this._globalLightPosition = p
        const vp = ether.mat4.apply(this._matView, p)
        this.uniformsData.set(vp, 52)
        this.device.queue.writeBuffer(this.uniforms, 52 * 4, this.uniformsData, 52, 4)
    }

    get shininess(): number {
        return this.uniformsData[56]
    }

    set shininess(s: number) {
        this.uniformsData[56] = s
        this.device.queue.writeBuffer(this.uniforms, 56 * 4, this.uniformsData, 56, 1)
    }

    get lightRadius(): number {
        return this.uniformsData[57]
    }

    set lightRadius(s: number) {
        this.uniformsData[57] = s
        this.device.queue.writeBuffer(this.uniforms, 57 * 4, this.uniformsData, 57, 1)
    }

    get fogginess(): number {
        return this.uniformsData[58]
    }

    set fogginess(f: number) {
        this.uniformsData[58] = f
        this.device.queue.writeBuffer(this.uniforms, 58 * 4, this.uniformsData, 58, 1)
    }

    async setMesh(primitives: GLenum, vertices: Float32Array) {
        if (this._next) {
            this._next.destroy()
        }
        this._next = GPUView.createBuffer(this.device, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, vertices)
        this._nextCount = vertices.length / 6
        if (!this._frame) {
            this._frame = () => {
                this.draw()
                if (this._frame) {
                    requestAnimationFrame(this._frame)
                }
            }
            this._frame()
        }
    }

    private draw() {
        if (this._next) {
            this.vertices.destroy()
            this.vertices = this._next
            this._next = null
            this._verticesCount = this._nextCount
        }
        const encoder = this.device.createCommandEncoder()
        const passDescription: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: this.colorView,
                resolveTarget: this.context.getCurrentTexture().createView(),
                loadValue: { r: 1, g: 1, b: 1, a: 1 },
                storeOp: "discard"
            }],
            depthStencilAttachment: {
                depthLoadValue: 1,
                depthStoreOp: "discard",
                stencilLoadValue: "load",
                stencilStoreOp: "discard",
                view: this.depthView
            }
        };
        const pass = encoder.beginRenderPass(passDescription)
        pass.setPipeline(this.pipeline)
        pass.setVertexBuffer(0, this.vertices)
        pass.setBindGroup(0, this.uniformsGroup)
        pass.draw(this._verticesCount)
        pass.endPass()
        this.device.queue.submit([encoder.finish()])
    }

}

export async function newView(canvasId: string): Promise<v.View> {
    const shaders = await gear.fetchTextFiles({
        shader: "generic.wgsl"
    }, "/shaders")
    const gpu = v.required(navigator.gpu)
    const adapter = v.required(await gpu.requestAdapter())
    const device = v.required(await adapter.requestDevice())
    return new GPUView(device, adapter, canvasId, shaders.shader)
}
