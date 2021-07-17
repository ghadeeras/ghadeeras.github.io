import { failure } from "./utils.js";
export class Buffer {
    constructor(target, context, byteStride = 0, isDynamic = false) {
        var _a;
        this.target = target;
        this.context = context;
        this.byteStride = byteStride;
        this._data = new Uint8Array([]);
        const gl = context.gl;
        this.glBuffer = (_a = gl.createBuffer()) !== null && _a !== void 0 ? _a : failure(`Failed to create GL buffer in context: ${this.context.canvas.id}`);
        this.usageHint = isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
    }
    delete() {
        this.context.gl.deleteBuffer(this.glBuffer);
    }
    bind() {
        this.context.gl.bindBuffer(this.target, this.glBuffer);
    }
    get word() {
        return this._data.BYTES_PER_ELEMENT;
    }
    get count() {
        return this.byteStride > 0 ?
            this._data.byteLength / this.byteStride :
            this._data.length;
    }
    get data() {
        return this._data;
    }
    set data(data) {
        if (this.byteStride != 0 && this.byteStride % data.BYTES_PER_ELEMENT != 0) {
            failure(`Byte stride of ${this.byteStride} byte(s) is incompatible with number array type element size of ${data.BYTES_PER_ELEMENT} bytes!`);
        }
        this.bind();
        this.context.gl.bufferData(this.target, data, this.usageHint);
        this._data = data;
    }
    set uint32Data(data) {
        this.data = new Uint32Array(data);
    }
    set uint16Data(data) {
        this.data = new Uint16Array(data);
    }
    set uint8Data(data) {
        this.data = new Uint8Array(data);
    }
}
export class AttributesBuffer extends Buffer {
    constructor(context, byteStride = 0, isDynamic = false) {
        super(WebGLRenderingContext.ARRAY_BUFFER, context, byteStride, isDynamic);
        this.context = context;
        this.byteStride = byteStride;
    }
    set float32Data(data) {
        this.data = new Float32Array(data);
    }
    set int32Data(data) {
        this.data = new Int32Array(data);
    }
    set int16Data(data) {
        this.data = new Int16Array(data);
    }
    set int8Data(data) {
        this.data = new Int8Array(data);
    }
    draw(mode, count = this.count, first = 0) {
        this.context.gl.drawArrays(mode, first, count);
    }
}
export class IndicesBuffer extends Buffer {
    constructor(context, isDynamic = false) {
        super(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, context, 0, isDynamic);
        this.type = this.glTypeOf(this._data);
    }
    glTypeOf(data) {
        if (data instanceof Uint32Array) {
            this.requestOESElementIndexUintExtension();
            return WebGLRenderingContext.UNSIGNED_INT;
        }
        else if (data instanceof Uint16Array) {
            return WebGLRenderingContext.UNSIGNED_SHORT;
        }
        else if (data instanceof Uint8Array) {
            return WebGLRenderingContext.UNSIGNED_BYTE;
        }
        else {
            return failure("Unsupported array type for indices buffer!");
        }
    }
    requestOESElementIndexUintExtension() {
        if (this.context.gl.getExtension("OES_element_index_uint") == null) {
            failure("Unsigned integer element arrays are not supported!");
        }
    }
    set data(data) {
        this.type = this.glTypeOf(data);
        super.data = data;
    }
    draw(mode, count = this.data.length, offset = 0) {
        this.context.gl.drawElements(mode, count, this.type, offset);
    }
}
//# sourceMappingURL=buffer.js.map