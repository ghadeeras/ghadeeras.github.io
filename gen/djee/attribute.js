import { BufferTarget } from "./buffer.js";
import { failure } from "./utils.js";
export class Attribute {
    constructor(program, name) {
        var _a;
        this.program = program;
        this.name = name;
        const gl = program.context.gl;
        this.location = gl.getAttribLocation(program.program, name);
        this.info = (_a = program.attributeInfos[name]) !== null && _a !== void 0 ? _a : failure(`Could not introspect attribute '${name}'`);
        this.setter = getSetter(gl, this.location, this.info);
    }
    pointTo(buffer, stride = 0, offset = 0, size) {
        BufferTarget.arrayBuffer.with(buffer, gl => {
            gl.enableVertexAttribArray(this.location);
            gl.vertexAttribPointer(this.location, this.info.itemDimensions, this.info.primitiveType, false, stride * this.info.primitiveSize, offset * this.info.primitiveSize);
        });
    }
    setTo(...components) {
        if (components.length != this.info.itemSize) {
            failure(`Arrays of length '${components.length}' cannot be assigned to ${this.info.itemOrderName} attribute '${this.name}' of size '${this.info.itemSize}'`);
        }
        this.setter(components);
    }
}
function getSetter(gl, location, info) {
    switch (info.itemDimensions) {
        case 1: return (d) => gl.vertexAttrib1fv(location, d);
        case 2: return (d) => gl.vertexAttrib2fv(location, d);
        case 3: return (d) => gl.vertexAttrib3fv(location, d);
        case 4: return (d) => gl.vertexAttrib4fv(location, d);
        default: return failure(`Attribute vectors of length '${info.itemDimensions}' are not supported.`);
    }
}
//# sourceMappingURL=attribute.js.map