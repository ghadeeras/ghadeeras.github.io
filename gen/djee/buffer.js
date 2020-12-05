export class Buffer {
    constructor(context) {
        var _a;
        this.context = context;
        this._data = new Float32Array([]);
        this.buffer = (_a = context.gl.createBuffer()) !== null && _a !== void 0 ? _a : this.failure();
    }
    failure() {
        throw new Error("Failed to create GL buffer in context: " + this.context.canvas.id);
    }
    bind(glCode) {
        return this.context.with(gl => {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            return glCode(gl);
        });
    }
    get data() {
        return this._data;
    }
    set data(data) {
        this.bind(gl => gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW));
        this._data = data;
    }
    set untypedData(data) {
        this.data = new Float32Array(data);
    }
}
//# sourceMappingURL=buffer.js.map