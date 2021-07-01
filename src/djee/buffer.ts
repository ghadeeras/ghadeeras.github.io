import { Context } from "./context.js"
import { failure } from "./utils.js"

export type NumberArray = Float32Array | Int16Array | Int8Array | Uint16Array | Uint8Array

export class BufferTarget {

    static readonly arrayBuffer: BufferTarget = new BufferTarget(WebGLRenderingContext.ARRAY_BUFFER)
    static readonly elementArrayBuffer: BufferTarget = new BufferTarget(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER)

    private constructor(readonly id: GLenum) {
    }

    with<T>(buffer: Buffer, glCode: (gl: WebGLRenderingContext) => T): T {
        const gl = buffer.context.gl
        gl.bindBuffer(this.id, buffer.glBuffer)
        try {
            return glCode(gl)
        } finally {
            gl.bindBuffer(this.id, null)
        }
    }

    fill(buffer: Buffer, data: NumberArray) {
        this.with(buffer, gl => gl.bufferData(this.id, data, buffer.usageHint))
    }

}

export class Buffer {

    readonly glBuffer: WebGLBuffer
    readonly usageHint: GLenum;

    private _data: NumberArray = new Float32Array([])

    constructor(readonly context: Context, isDynamic: boolean = false) {
        const gl = context.gl
        this.glBuffer = gl.createBuffer() ?? failure(`Failed to create GL buffer in context: ${this.context.canvas.id}`)
        this.usageHint = isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
    }

    delete() {
        this.context.gl.deleteBuffer(this.glBuffer)
    }

    get data() {
        return this._data
    }

    set data(data: NumberArray) {
        const gl = this.context.gl
        BufferTarget.arrayBuffer.fill(this, data)
        this._data = data
    }

    set float32Data(data: number[]) {
        this.data = new Float32Array(data)
    }

}
