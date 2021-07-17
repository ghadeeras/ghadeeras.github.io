import { Program } from "./program.js"
import { AttributesBuffer } from "./buffer.js"
import { failure } from "./utils.js";
import { VariableInfo } from "./reflection.js";

export class Attribute {

    readonly location: number;
    readonly info: VariableInfo
    readonly setter: (data: number[]) => void;

    constructor(readonly program: Program, readonly name: string) {
        const gl = program.context.gl;
        this.location = gl.getAttribLocation(program.program, name);
        this.info = program.attributeInfos[name] ?? failure(`Could not introspect attribute '${name}'`)
        this.setter = getSetter(gl, this.location, this.info)
    }

    pointTo(buffer: AttributesBuffer, byteOffset: number = 0, normalized: boolean = false, info: VariableInfo = this.info) {
        buffer.bind()
        const gl = buffer.context.gl
        gl.enableVertexAttribArray(this.location);
        gl.vertexAttribPointer(
            this.location,
            info.itemDimensions,
            info.primitiveType,
            normalized,
            buffer.byteStride,
            byteOffset
        );
    }

    setTo(...components: number[]) {
        if (components.length != this.info.itemSize) {
            failure(`Arrays of length '${components.length}' cannot be assigned to ${this.info.itemOrderName} attribute '${this.name}' of size '${this.info.itemSize}'`);
        }
        this.program.context.gl.disableVertexAttribArray(this.location);
        this.setter(components);
    }

}

function getSetter(gl: WebGLRenderingContext, location: number, info: VariableInfo): (data: number[]) => void {
    switch (info.itemDimensions) {
        case 1: return (d) => gl.vertexAttrib1fv(location, d);
        case 2: return (d) => gl.vertexAttrib2fv(location, d);
        case 3: return (d) => gl.vertexAttrib3fv(location, d);
        case 4: return (d) => gl.vertexAttrib4fv(location, d);
        default: return failure(`Attribute vectors of length '${info.itemDimensions}' are not supported.`);
    }
}
