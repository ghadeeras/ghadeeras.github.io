import { Context } from "./context.js"

export class Buffer {

    readonly buffer: WebGLBuffer;

    private _data: Float32Array;

    constructor(readonly context: Context) {
        this.buffer = context.gl.createBuffer();
    }

    bind<T>(glCode: (gl: WebGLRenderingContext) => T) {
        return this.context.with(gl => {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            return glCode(gl);
        });
    }

    get data() {
        return this._data;
    }

    set data(data: Float32Array) {
        this.bind(gl =>
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
        );
        this._data = data;
    }

    set untypedData(data: number[]) {
        this.data = new Float32Array(data);
    }

}
