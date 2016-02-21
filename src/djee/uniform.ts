module Djee {

    export class Uniform {

        private _program: Program;
        private _name: string;
        private _size: number;
        private _location: WebGLUniformLocation;
        private _setter: (v: Float32Array) => void;
        private _data: number[];

        get program() {
            return this._program;
        }

        get name() {
            return this._name;
        }

        get size() {
            return this._size;
        }

        get location() {
            return this._location;
        }

        constructor(program: Program, name: string, size: number) {
            this._program = program;
            this._name = name;
            this._size = size;
            this._data = new Array(size);
            program.context.with(gl => {
                this._location = gl.getUniformLocation(program.program, name);
                this._setter = this.getSetter(gl, size);
            });
        }

        private getSetter(gl: WebGLRenderingContext, size: number): (data: Float32Array) => void {
            var l = this.location;
            switch (size) {
                case 1: return (d) => gl.uniform1fv(l, d);
                case 2: return (d) => gl.uniform2fv(l, d);
                case 3: return (d) => gl.uniform3fv(l, d);
                case 4: return (d) => gl.uniform4fv(l, d);
                default: throw `Uniform vectors of length '${size}' are not supported.`;
            }
        }
        
        get data() {
            return copyOf(this._data.slice());
        }

        set data(data: number[]) {
            if (data.length < this._size) {
                throw `Arrays of length '${data.length}' cannot be assigned to uniform vector '${this._name}' which has size '${this._size}'`;
            }
            this._setter(new Float32Array(data));
            this._data = copyOf(data);
        }

    }

}