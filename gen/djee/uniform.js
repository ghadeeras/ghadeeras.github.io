import { failure } from "./utils.js";
export class Uniform {
    constructor(program, name) {
        var _a, _b;
        this.program = program;
        this.name = name;
        const gl = program.context.gl;
        this.location = (_a = gl.getUniformLocation(program.program, name)) !== null && _a !== void 0 ? _a : this.failure(name);
        this.info = (_b = program.uniformInfos[name]) !== null && _b !== void 0 ? _b : failure(`Could not introspect attribute '${name}'`);
        this.setter = getSetter(gl, this.location, this.info);
        this._data = new Array(this.info.itemSize);
    }
    failure(name) {
        throw new Error("Failed to get GL uniform: " + name);
    }
    get data() {
        return [...this._data];
    }
    set data(data) {
        if (data.length != this.info.itemSize) {
            failure(`Arrays of length '${data.length}' cannot be assigned to ${this.info.itemOrderName} uniform '${this.name}' which has size '${this.info.itemSize}'`);
        }
        this.setter(data);
        this._data = [...data];
    }
}
function getSetter(gl, location, info) {
    if (info.itemOrder == 2) {
        switch (info.itemDimensions) {
            case 2: return (d) => gl.uniformMatrix2fv(location, false, d);
            case 3: return (d) => gl.uniformMatrix3fv(location, false, d);
            case 4: return (d) => gl.uniformMatrix4fv(location, false, d);
            default: throw `Uniform matrices of size '${info.itemDimensions}' are not supported.`;
        }
    }
    else if (info.primitiveType == WebGLRenderingContext.FLOAT) {
        switch (info.itemDimensions) {
            case 1: return (d) => gl.uniform1fv(location, d);
            case 2: return (d) => gl.uniform2fv(location, d);
            case 3: return (d) => gl.uniform3fv(location, d);
            case 4: return (d) => gl.uniform4fv(location, d);
            default: throw `Uniform vectors of length '${info.itemDimensions}' are not supported.`;
        }
    }
    else {
        switch (info.itemDimensions) {
            case 1: return (d) => gl.uniform1iv(location, d);
            case 2: return (d) => gl.uniform2iv(location, d);
            case 3: return (d) => gl.uniform3iv(location, d);
            case 4: return (d) => gl.uniform4iv(location, d);
            default: throw `Uniform vectors of length '${info.itemDimensions}' are not supported.`;
        }
    }
}
//# sourceMappingURL=uniform.js.map