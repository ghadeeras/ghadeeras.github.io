import { Attribute } from "./attribute.js";
import { Uniform } from "./uniform.js";
export class Program {
    constructor(context, shaders) {
        this.context = context;
        this.shaders = shaders;
        this.program = this.makeProgram(context.gl, shaders);
    }
    makeProgram(gl, shaders) {
        const program = gl.createProgram();
        shaders.forEach(s => {
            gl.attachShader(program, s.shader);
        });
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw `Unable to initialize the shader program: ${gl.getProgramInfoLog(program)}`;
        }
        return program;
    }
    delete() {
        const gl = this.context.gl;
        this.shaders.forEach(shader => {
            gl.detachShader(this.program, shader.shader);
            gl.deleteShader(shader.shader);
        });
        gl.deleteProgram(this.program);
    }
    use() {
        this.context.gl.useProgram(this.program);
    }
    locateAttribute(name, size) {
        return new Attribute(this, name, size);
    }
    locateUniform(name, size, matrix = false) {
        return new Uniform(this, name, size, matrix);
    }
    get uniforms() {
        const gl = this.context.gl;
        return this.activeInfos(gl.ACTIVE_UNIFORMS, i => gl.getActiveUniform(this.program, i));
    }
    get attributes() {
        const gl = this.context.gl;
        return this.activeInfos(gl.ACTIVE_ATTRIBUTES, i => gl.getActiveAttrib(this.program, i));
    }
    activeInfos(type, getter) {
        const gl = this.context.gl;
        const count = gl.getProgramParameter(this.program, type);
        const result = [];
        for (let i = 0; i < count; i++) {
            const info = getter(i);
            result.push({
                name: info.name,
                type: info.type,
                dimensions: this.dimensions(info),
                size: info.size
            });
        }
        return result;
    }
    dimensions(info) {
        const gl = this.context.gl;
        switch (info.type) {
            case gl.FLOAT: return 1;
            case gl.FLOAT_VEC2: return 2;
            case gl.FLOAT_VEC3: return 3;
            case gl.FLOAT_VEC4: return 4;
            default: throw "Unsupported type: " + info.type;
        }
        ;
    }
}
//# sourceMappingURL=program.js.map