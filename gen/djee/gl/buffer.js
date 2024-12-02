import { failure } from "../utils.js";
export class Buffer {
    constructor(target, context, byteStride = 0, isDynamic = false) {
        this.target = target;
        this.context = context;
        this.byteStride = byteStride;
        this._data = new Float32Array([]);
        const gl = context.gl;
        this.glBuffer = gl.createBuffer() ?? failure(`Failed to create GL buffer in context: ${this.context.canvas.id}`);
        this.usageHint = isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
    }
    destroy() {
        this.delete();
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
        super(WebGL2RenderingContext.ARRAY_BUFFER, context, byteStride, isDynamic);
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
        super(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, context, 0, isDynamic);
        this.type = WebGL2RenderingContext.UNSIGNED_SHORT;
        this.data = new Uint16Array([]);
    }
    glTypeOf(data) {
        if (data instanceof Uint32Array) {
            return WebGL2RenderingContext.UNSIGNED_INT;
        }
        else if (data instanceof Uint16Array) {
            return WebGL2RenderingContext.UNSIGNED_SHORT;
        }
        else if (data instanceof Uint8Array) {
            return WebGL2RenderingContext.UNSIGNED_BYTE;
        }
        else {
            return failure("Unsupported array type for indices buffer!");
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