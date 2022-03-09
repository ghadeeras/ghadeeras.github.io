import { Context } from "./context.js"
import { failure } from "../utils.js"

export class Shader {

    readonly glShader: WebGLShader

    constructor(readonly context: Context, readonly type: ShaderType, readonly code: string, readonly reusable: boolean = false) {
        this.glShader = makeShader(context, type, code)
    }
    
    static fromElement(context: Context, scriptElementId: string) {
        const scriptElement = getScriptElement(scriptElementId)
        const type = getShaderType(scriptElement)
        const code = scriptElement.innerHTML
        return new Shader(context, type, code)
    }

    delete() {
        this.context.gl.deleteShader(this.glShader)
    }

    linkTo(...shaders: Shader[]) {
        return this.context.link(this, ...shaders)
    }

}

export enum ShaderType {
    VertexShader = WebGL2RenderingContext.VERTEX_SHADER,
    FragmentShader = WebGL2RenderingContext.FRAGMENT_SHADER
}

function getScriptElement(scriptElementId: string): HTMLElement {
    const scriptElement = document.getElementById(scriptElementId)
    return scriptElement ?? failure(`No script found with ID: ${scriptElementId}`)
}

function getShaderType(script: HTMLElement): ShaderType {
    const type = script.getAttribute('type') ?? "x-shader/x-vertex"
    switch (type) {
        case "x-shader/x-vertex": return ShaderType.VertexShader 
        case "x-shader/x-fragment": return ShaderType.FragmentShader
        default: return failure(`Unknown shader type for script type: ${type}`)
    }
}

function makeShader(context: Context, type: ShaderType, code: string): WebGLShader {
    const gl = context.gl
    const shader = gl.createShader(type)
    if (!shader) {
        return failure(`Failed to create GL shader in context: ${context.canvas.id}`)
    }
    gl.shaderSource(shader, code)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const logs = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        return failure(`Error compiling shader: ${logs}`)
    }
    return shader
}
