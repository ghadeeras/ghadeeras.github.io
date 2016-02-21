module Djee {

    export class Buffer {

        private _context: Context;
        private _buffer: WebGLBuffer;
        private _data: number[];

        get context() {
            return this._context;
        }

        get buffer() {
            return this._buffer;
        }

        constructor(context: Context) {
            this._context = context;
            this._buffer = context.gl.createBuffer();
            this._data = [];
        }

        bind<T>(glCode: (gl: WebGLRenderingContext) => T) {
            return this._context.with(gl => {
                gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
                return glCode(gl);
            });
        }

        get data() {
            return copyOf(this._data.slice());
        }

        set data(data: number[]) {
            var array = new Float32Array(data);
            this.bind(gl =>
                gl.bufferData(gl.ARRAY_BUFFER, array, gl.DYNAMIC_DRAW)
            );
            this._data = copyOf(data);
        }

    }

}