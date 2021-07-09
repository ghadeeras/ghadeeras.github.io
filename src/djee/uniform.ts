import { Program } from "./program.js"
import { VariableInfo } from "./reflection.js";
import { failure } from "./utils.js";

export class Uniform {

    readonly location: WebGLUniformLocation;
    readonly info: VariableInfo
    readonly setter: (v: number[]) => void;

    private _data: number[];

    constructor(readonly program: Program, readonly name: string) {
        const gl = program.context.gl;
        this.location = gl.getUniformLocation(program.program, name) ?? this.failure(name);
        this.info = program.uniformInfos[name] ?? failure(`Could not introspect attribute '${name}'`)
        this.setter = getSetter(gl, this.location, this.info);

        this._data = new Array(this.info.itemSize);
    }

    private failure(name: string): WebGLUniformLocation {
        throw new Error("Failed to get GL uniform: " + name)
    }

    get data() {
        return [...this._data];
    }

    set data(data: number[] | Float32Array | Float64Array) {
        if (data.length != this.info.itemSize) {
            failure(`Arrays of length '${data.length}' cannot be assigned to ${this.info.itemOrderName} uniform '${this.name}' which has size '${this.info.itemSize}'`);
        }
        const copy = [...data];
        this.setter(copy);
        this._data = copy;
    }

}

function getSetter(gl: WebGLRenderingContext, location: WebGLUniformLocation, info: VariableInfo): (data: number[]) => void {
    if (info.itemOrder == 2) {
        switch (info.itemDimensions) {
            case 2: return (d) => gl.uniformMatrix2fv(location, false, d);
            case 3: return (d) => gl.uniformMatrix3fv(location, false, d);
            case 4: return (d) => gl.uniformMatrix4fv(location, false, d);
            default: throw `Uniform matrices of size '${info.itemDimensions}' are not supported.`;
        }
    } else if (info.primitiveType == WebGLRenderingContext.FLOAT) {
        switch (info.itemDimensions) {
            case 1: return (d) => gl.uniform1fv(location, d);
            case 2: return (d) => gl.uniform2fv(location, d);
            case 3: return (d) => gl.uniform3fv(location, d);
            case 4: return (d) => gl.uniform4fv(location, d);
            default: throw `Uniform vectors of length '${info.itemDimensions}' are not supported.`;
        }
    } else {
        switch (info.itemDimensions) {
            case 1: return (d) => gl.uniform1iv(location, d);
            case 2: return (d) => gl.uniform2iv(location, d);
            case 3: return (d) => gl.uniform3iv(location, d);
            case 4: return (d) => gl.uniform4iv(location, d);
            default: throw `Uniform vectors of length '${info.itemDimensions}' are not supported.`;
        }
    }
}
