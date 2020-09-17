module Djee {

    export class Uniform {

        readonly location: WebGLUniformLocation;
        readonly setter: (v: Float64Array) => void;

        private _data: number[];

        constructor(readonly program: Program, readonly name: string, readonly size: number, readonly matrix: boolean = false) {
            const gl = program.context.gl;

            this.location = gl.getUniformLocation(program.program, name);
            this.setter = this.getSetter(gl, size, matrix);
            
            this._data = new Array(matrix ? size * size : size);
        }

        private getSetter(gl: WebGLRenderingContext, size: number, matrix: boolean): (data: Float64Array) => void {
            const location = this.location;
            if (matrix) {
                switch (size) {
                    case 2: return (d) => gl.uniformMatrix2fv(location, false, d);
                    case 3: return (d) => gl.uniformMatrix3fv(location, false, d);
                    case 4: return (d) => gl.uniformMatrix4fv(location, false, d);
                    default: throw `Uniform matrices of size '${size}' are not supported.`;
                }
            } else {
                switch (size) {
                    case 1: return (d) => gl.uniform1fv(location, d);
                    case 2: return (d) => gl.uniform2fv(location, d);
                    case 3: return (d) => gl.uniform3fv(location, d);
                    case 4: return (d) => gl.uniform4fv(location, d);
                    default: throw `Uniform vectors of length '${size}' are not supported.`;
                }
            }
        }
        
        get data() {
            return copyOf(this._data);
        }

        set data(data: number[]) {
            if (data.length != this._data.length) {
                throw `Arrays of length '${data.length}' cannot be assigned to uniform ${this.matrix ? 'matrix' : 'vector'} '${this.name}' which has size '${this.size}'`;
            }
            this.setter(new Float64Array(data));
            this._data = copyOf(data);
        }

    }

}