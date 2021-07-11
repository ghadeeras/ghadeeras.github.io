import { Context } from "./context.js"
import { failure } from "./utils.js"

export type NumberArray = Float32Array | Int32Array | Int16Array | Int8Array | Uint32Array | Uint16Array | Uint8Array

export class BufferTarget {

    static readonly arrayBuffer: BufferTarget = new BufferTarget(WebGLRenderingContext.ARRAY_BUFFER)
    static readonly elementArrayBuffer: BufferTarget = new BufferTarget(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER)

    private constructor(readonly id: GLenum) {
    }

    bind<T>(buffer: Buffer): void {
        buffer.context.gl.bindBuffer(this.id, buffer.glBuffer)
    }

    fill(buffer: Buffer, data: NumberArray) {
        this.bind(buffer)
        buffer.context.gl.bufferData(this.id, data, buffer.usageHint)
    }

}

export class Buffer {

    readonly glBuffer: WebGLBuffer
    readonly usageHint: GLenum;

    private _data: NumberArray = new Float32Array([])

    constructor(readonly context: Context, readonly byteStride: number = 0, isDynamic: boolean = false, readonly target: BufferTarget = BufferTarget.arrayBuffer) {
        const gl = context.gl
        this.glBuffer = gl.createBuffer() ?? failure(`Failed to create GL buffer in context: ${this.context.canvas.id}`)
        this.usageHint = isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
    }

    delete() {
        this.context.gl.deleteBuffer(this.glBuffer)
    }

    get word() {
        return this.data.BYTES_PER_ELEMENT
    }

    get data() {
        return this._data
    }

    set data(data: NumberArray) {
        const gl = this.context.gl
        this.target.fill(this, data)
        this._data = data
    }

    set float32Data(data: number[]) {
        this.data = new Float32Array(data)
    }

}
