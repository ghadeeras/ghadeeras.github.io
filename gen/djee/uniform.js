export class Uniform {
    constructor(program, name, size, matrix = false) {
        var _a;
        this.program = program;
        this.name = name;
        this.size = size;
        this.matrix = matrix;
        const gl = program.context.gl;
        this.location = (_a = gl.getUniformLocation(program.program, name)) !== null && _a !== void 0 ? _a : this.failure(name);
        this.setter = this.getSetter(gl, size, matrix);
        this._data = new Array(matrix ? size * size : size);
    }
    failure(name) {
        throw new Error("Failed to get GL uniform: " + name);
    }
    getSetter(gl, size, matrix) {
        const location = this.location;
        if (matrix) {
            switch (size) {
                case 2: return (d) => gl.uniformMatrix2fv(location, false, d);
                case 3: return (d) => gl.uniformMatrix3fv(location, false, d);
                case 4: return (d) => gl.uniformMatrix4fv(location, false, d);
                default: throw `Uniform matrices of size '${size}' are not supported.`;
            }
        }
        else {
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
        return [...this._data];
    }
    set data(data) {
        if (data.length != this._data.length) {
            throw `Arrays of length '${data.length}' cannot be assigned to uniform ${this.matrix ? 'matrix' : 'vector'} '${this.name}' which has size '${this.size}'`;
        }
        this.setter(new Float64Array(data));
        this._data = [...data];
    }
}
//# sourceMappingURL=uniform.js.map