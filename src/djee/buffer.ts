module Djee {

    export class Buffer {

        readonly buffer: WebGLBuffer;

        private _data: number[] = [];

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
            return copyOf(this._data);
        }

        set data(data: number[]) {
            const array = new Float32Array(data);
            this.bind(gl =>
                gl.bufferData(gl.ARRAY_BUFFER, array, gl.DYNAMIC_DRAW)
            );
            this._data = copyOf(data);
        }

    }

}