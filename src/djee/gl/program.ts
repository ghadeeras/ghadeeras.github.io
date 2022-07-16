import { Context } from "./context.js"
import { Shader } from "./shader.js"
import { Attribute } from "./attribute.js"
import { Uniform } from "./uniform.js"
import { failure, lazily } from "../utils.js"
import { asVariableInfo, VariableInfos } from "./introspection.js"

export class Program {

    readonly program: WebGLProgram

    private readonly _uniformInfos = lazily(() => {
        const gl = this.context.gl
        return this.activeInfos(gl.ACTIVE_UNIFORMS, i => gl.getActiveUniform(this.program, i))
    })

    private readonly _attributeInfos = lazily(() => {
        const gl = this.context.gl
        return this.activeInfos(gl.ACTIVE_ATTRIBUTES, i => gl.getActiveAttrib(this.program, i))
    })

    constructor(readonly context: Context, shaders: Shader[]) {
        this.program = makeProgram(context, shaders)
    }

    delete() {
        this.context.gl.deleteProgram(this.program)
    }

    use() {
        this.context.gl.useProgram(this.program)
    }
    
    attribute(name: string) {
        return new Attribute(this, name)
    }

    uniform(name: string) {
        return new Uniform(this, name)
    }

    get attributeInfos() {
        return this._attributeInfos()
    }

    get uniformInfos() {
        return this._uniformInfos()
    }

    private activeInfos(type: number, getter: (index: number) => WebGLActiveInfo | null) {
        const gl = this.context.gl
        const count: number = gl.getProgramParameter(this.program, type)
        const result: VariableInfos = {}
        for (let i = 0; i < count; i++) {
            const info = getter(i)
            if (!info) {
                continue
            }
            const varInfo = asVariableInfo(info) 
            result[varInfo.name] = varInfo
        }
        return result
    }

}

function makeProgram(context: Context, shaders: Shader[]): WebGLProgram {
    const gl = context.gl

    const program = gl.createProgram()
    if (!program) {
        return failure(`Failed to create GL program in context:  ${context.canvas.id}`)
    }

    for (const shader of shaders) {
        gl.attachShader(program, shader.glShader)
    }

    gl.linkProgram(program)

    for (const shader of shaders) {
        gl.detachShader(program, shader.glShader)
        if (!shader.reusable) {
            shader.delete()
        }
    }

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const logs = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        return failure(`Unable to initialize the shader program: ${logs}`)
    }
    
    return program
}
