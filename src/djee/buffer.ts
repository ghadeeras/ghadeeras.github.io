import { Context } from "./context.js"
import { failure } from "./utils.js"

export type NumberArray = Float32Array | Int32Array | Int16Array | Int8Array | Uint32Array | Uint16Array | Uint8Array

export type BufferTarget = WebGLRenderingContext[
    "ARRAY_BUFFER" |
    "ELEMENT_ARRAY_BUFFER"
]

export abstract class Buffer {

    readonly glBuffer: WebGLBuffer
    readonly usageHint: GLenum;

    protected _data: NumberArray = new Uint8Array([])

    constructor(
        readonly target: BufferTarget,
        readonly context: Context, 
        readonly byteStride: number = 0, 
        isDynamic: boolean = false 
    ) {
        const gl = context.gl
        this.glBuffer = gl.createBuffer() ?? failure(`Failed to create GL buffer in context: ${this.context.canvas.id}`)
        this.usageHint = isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
    }

    delete() {
        this.context.gl.deleteBuffer(this.glBuffer)
    }

    bind<T>(): void {
        this.context.gl.bindBuffer(this.target, this.glBuffer)
    }

    get word() {
        return this._data.BYTES_PER_ELEMENT
    }

    get count() {
        return this.byteStride > 0 ? 
            this._data.byteLength / this.byteStride : 
            this._data.length
    }

    get data() {
        return this._data
    }

    set data(data: NumberArray) {
        if (this.byteStride != 0 && this.byteStride % data.BYTES_PER_ELEMENT != 0) {
            failure(`Byte stride of ${this.byteStride} byte(s) is incompatible with number array type element size of ${data.BYTES_PER_ELEMENT} bytes!`)
        }
        this.bind()
        this.context.gl.bufferData(this.target, data, this.usageHint)
        this._data = data
    }

    set uint32Data(data: number[] | ArrayBuffer) {
        this.data = new Uint32Array(data)
    }

    set uint16Data(data: number[] | ArrayBuffer) {
        this.data = new Uint16Array(data)
    }

    set uint8Data(data: number[] | ArrayBuffer) {
        this.data = new Uint8Array(data)
    }

}

export class AttributesBuffer extends Buffer {

    constructor(readonly context: Context, readonly byteStride: number = 0, isDynamic: boolean = false) {
        super(WebGLRenderingContext.ARRAY_BUFFER, context, byteStride, isDynamic)
    }

    set float32Data(data: number[] | ArrayBuffer) {
        this.data = new Float32Array(data)
    }

    set int32Data(data: number[] | ArrayBuffer) {
        this.data = new Int32Array(data)
    }

    set int16Data(data: number[] | ArrayBuffer) {
        this.data = new Int16Array(data)
    }

    set int8Data(data: number[] | ArrayBuffer) {
        this.data = new Int8Array(data)
    }

    draw(mode: GLenum, count: number = this.count, first: number = 0) {
        this.context.gl.drawArrays(mode, first, count)
    }

}

export class IndicesBuffer extends Buffer {

    private type = this.glTypeOf(this._data)

    constructor(context: Context, isDynamic: boolean = false) {
        super(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, context, 0, isDynamic)
    }

    private glTypeOf(data: NumberArray) {
        if (data instanceof Uint32Array) {
            this.requestOESElementIndexUintExtension()
            return WebGLRenderingContext.UNSIGNED_INT 
        } else if (data instanceof Uint16Array) {
            return WebGLRenderingContext.UNSIGNED_SHORT 
        } else if (data instanceof Uint8Array) {
            return WebGLRenderingContext.UNSIGNED_BYTE 
        } else {
            return failure<number>("Unsupported array type for indices buffer!")
        }
    }

    private requestOESElementIndexUintExtension() {
        if (this.context.gl.getExtension("OES_element_index_uint") == null) {
            failure("Unsigned integer element arrays are not supported!")
        }
    }

    set data(data: NumberArray) {
        this.type = this.glTypeOf(data)
        super.data = data
    }

    draw(mode: GLenum, count: number = this.data.length, offset: number = 0) {
        this.context.gl.drawElements(mode, count, this.type, offset)
    }

}
