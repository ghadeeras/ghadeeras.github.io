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

export const vertexShaders = {
    
    fullScreenPass: `#version 300 es

        precision highp float;
        
        out vec2 _position;
        
        const vec2[3] triangle = vec2[] (
            vec2(-1.0, -1.0),
            vec2( 3.0, -1.0),
            vec2(-1.0,  3.0)
        );
        
        void main() {
            _position = triangle[gl_VertexID];
            gl_Position = vec4(_position, 0.0, 1);
        }    
    `

}

export const fragmentShaders = {
    
    fullScreenPass: (shader: string) => `#version 300 es

        #ifdef GL_ES
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        #endif
        
        in vec2 _position;
        out vec4 _fragColor;

        ${shader}

        void main() {
            float pixelSizeX = dFdx(_position.x); 
            float pixelSizeY = dFdy(_position.y); 
            float aspect = pixelSizeY / pixelSizeX;
            vec2 position = aspect >= 1.0
                ? vec2(_position.x * aspect, _position.y)
                : vec2(_position.x, _position.y / aspect);
            _fragColor = colorAt(position, aspect, aspect >= 1.0 ? pixelSizeY : pixelSizeX);
        }
    `
    
}
