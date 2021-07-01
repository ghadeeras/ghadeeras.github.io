import { Attribute } from "./attribute.js";
import { Uniform } from "./uniform.js";
import { failure, lazily } from "./utils.js";
import { asVariableInfo } from "./reflection.js";
export class Program {
    constructor(context, shaders) {
        this.context = context;
        this._uniformInfos = lazily(() => {
            const gl = this.context.gl;
            return this.activeInfos(gl.ACTIVE_UNIFORMS, i => gl.getActiveUniform(this.program, i));
        });
        this._attributeInfos = lazily(() => {
            const gl = this.context.gl;
            return this.activeInfos(gl.ACTIVE_ATTRIBUTES, i => gl.getActiveAttrib(this.program, i));
        });
        this.program = makeProgram(context, shaders);
    }
    delete() {
        this.context.gl.deleteProgram(this.program);
    }
    use() {
        this.context.gl.useProgram(this.program);
    }
    attribute(name) {
        return new Attribute(this, name);
    }
    uniform(name) {
        return new Uniform(this, name);
    }
    get attributeInfos() {
        return this._attributeInfos();
    }
    get uniformInfos() {
        return this._uniformInfos();
    }
    activeInfos(type, getter) {
        const gl = this.context.gl;
        const count = gl.getProgramParameter(this.program, type);
        const result = {};
        for (let i = 0; i < count; i++) {
            const info = getter(i);
            if (!info) {
                continue;
            }
            const varInfo = asVariableInfo(info);
            result[varInfo.name] = varInfo;
        }
        return result;
    }
}
function makeProgram(context, shaders) {
    const gl = context.gl;
    const program = gl.createProgram();
    if (!program) {
        return failure(`Failed to create GL program in context:  ${context.canvas.id}`);
    }
    for (let shader of shaders) {
        gl.attachShader(program, shader.glShader);
    }
    gl.linkProgram(program);
    for (let shader of shaders) {
        gl.detachShader(program, shader.glShader);
        if (!shader.reusable) {
            shader.delete();
        }
    }
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const logs = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        return failure(`Unable to initialize the shader program: ${logs}`);
    }
    return program;
}
//# sourceMappingURL=program.js.map