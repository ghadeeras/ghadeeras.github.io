import { Context } from "./context.js"
import { Shader } from "./shader.js"
import { Attribute } from "./attribute.js"
import { Uniform } from "./uniform.js"

export type Variable = {
    name: string;
    type: number;
    dimensions: number;
    size: number;
}

export class Program {

    readonly program: WebGLProgram;

    constructor(readonly context: Context, readonly shaders: Shader[]) {
        this.program = this.makeProgram(context.gl, shaders);
    }

    private makeProgram(gl: WebGLRenderingContext, shaders: Shader[]) {
        const program = gl.createProgram() ?? this.failure();
        shaders.forEach(s => {
            gl.attachShader(program, s.shader);
        });
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw `Unable to initialize the shader program: ${gl.getProgramInfoLog(program)}`;
        }
        return program;
    }
    
    private failure(): WebGLProgram {
        throw new Error("Failed to create GL program in context: " + this.context.canvas.id)
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
    
    locateAttribute(name: string, size: number) {
        return new Attribute(this, name, size);
    }

    locateUniform(name: string, size: number, matrix: boolean = false) {
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

    private activeInfos(type: number, getter: (index: number) => WebGLActiveInfo | null) {
        const gl = this.context.gl;
        const count: number = gl.getProgramParameter(this.program, type);
        const result: Variable[] = [];
        for (let i = 0; i < count; i++) {
            const info = getter(i);
            if (!info) {
                continue
            }
            result.push({
                name: info.name,
                type: info.type, 
                dimensions: this.dimensions(info),
                size: info.size
            });
        }
        return result;
    }

    private dimensions(info: WebGLActiveInfo) {
        const gl = this.context.gl;
        switch (info.type) {
            case gl.FLOAT: return 1;
            case gl.FLOAT_VEC2: return 2;
            case gl.FLOAT_VEC3: return 3;
            case gl.FLOAT_VEC4: return 4;
            default: throw "Unsupported type: " + info.type;
        };
    }

}
