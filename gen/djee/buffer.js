export class Buffer {
    constructor(context) {
        this.context = context;
        this.buffer = context.gl.createBuffer();
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