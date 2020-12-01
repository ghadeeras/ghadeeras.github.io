import { Context } from "./context.js"

export class Shader {

    readonly shader: WebGLShader;

    constructor(readonly context: Context, readonly type: ShaderType, readonly code: string) {
        this.context = context;
        this.type = type;
        this.code = code;
        this.shader = this.makeShader(context.gl, type, code);
    }
    
    static fromElement(context: Context, scriptId: string) {
        const script = this.getScript(scriptId);
        const type = this.getShaderType(script.getAttribute('type'));
        const code = script.innerHTML;
        return new Shader(context, type, code);
    }

    private static getScript(scriptId: string) {
        const script = document.getElementById(scriptId);
        if (!script) {
            throw `No script found with ID: ${scriptId}`
        }
        return script;
    }

    private static getShaderType(type: string) {
        if (type == "x-shader/x-vertex") {
            return ShaderType.VertexShader;
        } else if (type == "x-shader/x-fragment") {
            return ShaderType.FragmentShader;
        } else {
            throw `Unknown shader type for script type: ${type}`;
        }
    }

    private makeShader(gl: WebGLRenderingContext, type: ShaderType, code: string) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw `Error compiling shader: ${gl.getShaderInfoLog(shader)}`;
        }
        return shader;
    }

    delete() {
        this.context.gl.deleteShader(this.shader);
    }

}

export enum ShaderType {
    VertexShader = WebGLRenderingContext.VERTEX_SHADER,
    FragmentShader = WebGLRenderingContext.FRAGMENT_SHADER
}
