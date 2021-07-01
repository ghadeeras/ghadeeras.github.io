import { failure } from "./utils.js";
export class BufferTarget {
    constructor(id) {
        this.id = id;
    }
    with(buffer, glCode) {
        const gl = buffer.context.gl;
        gl.bindBuffer(this.id, buffer.glBuffer);
        try {
            return glCode(gl);
        }
        finally {
            gl.bindBuffer(this.id, null);
        }
    }
    fill(buffer, data) {
        this.with(buffer, gl => gl.bufferData(this.id, data, buffer.usageHint));
    }
}
BufferTarget.arrayBuffer = new BufferTarget(WebGLRenderingContext.ARRAY_BUFFER);
BufferTarget.elementArrayBuffer = new BufferTarget(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER);
export class Buffer {
    constructor(context, isDynamic = false) {
        var _a;
        this.context = context;
        this._data = new Float32Array([]);
        const gl = context.gl;
        this.glBuffer = (_a = gl.createBuffer()) !== null && _a !== void 0 ? _a : failure(`Failed to create GL buffer in context: ${this.context.canvas.id}`);
        this.usageHint = isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
    }
    delete() {
        this.context.gl.deleteBuffer(this.glBuffer);
    }
    get data() {
        return this._data;
    }
    set data(data) {
        const gl = this.context.gl;
        BufferTarget.arrayBuffer.fill(this, data);
        this._data = data;
    }
    set float32Data(data) {
        this.data = new Float32Array(data);
    }
}
//# sourceMappingURL=buffer.js.map