module Djee {

    export class Uniform {

        readonly location: WebGLUniformLocation;
        readonly setter: (v: Float32Array) => void;

        private _data: number[];

        constructor(readonly program: Program, readonly name: string, readonly size: number) {
            const gl = program.context.gl;
            this.location = gl.getUniformLocation(program.program, name);
            this.setter = this.getSetter(gl, size);
            
            this._data = new Array(size);
        }

        private getSetter(gl: WebGLRenderingContext, size: number): (data: Float32Array) => void {
            const l = this.location;
            switch (size) {
                case 1: return (d) => gl.uniform1fv(l, d);
                case 2: return (d) => gl.uniform2fv(l, d);
                case 3: return (d) => gl.uniform3fv(l, d);
                case 4: return (d) => gl.uniform4fv(l, d);
                default: throw `Uniform vectors of length '${size}' are not supported.`;
            }
        }
        
        get data() {
            return copyOf(this._data);
        }

        set data(data: number[]) {
            if (data.length < this.size) {
                throw `Arrays of length '${data.length}' cannot be assigned to uniform vector '${this.name}' which has size '${this.size}'`;
            }
            this.setter(new Float32Array(data));
            this._data = copyOf(data);
        }

    }

}