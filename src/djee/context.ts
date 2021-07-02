import { Shader, ShaderType } from "./shader.js"
import { Program } from "./program.js"
import { Buffer } from "./buffer.js"
import { failure } from "./utils.js"
import { Texture } from "./texture.js"

export class Context {

    readonly canvas: HTMLCanvasElement
    readonly gl: WebGLRenderingContext

    private constructor(canvasElementId: string) {
        this.canvas = getCanvas(canvasElementId)
        this.gl = getContext(this.canvas)
    }

    static of(canvasElementId: string) {
        return new Context(canvasElementId)
    }

    shaderFromElement(scriptId: string) {
        return Shader.fromElement(this, scriptId)
    }

    vertexShader(code: string) {
        return this.shader(ShaderType.VertexShader, code)
    }

    fragmentShader(code: string) {
        return this.shader(ShaderType.FragmentShader, code)
    }

    shader(type: ShaderType, code: string) {
        return new Shader(this, type, code)
    }

    linkFromElements(...scriptIds: string[]) {
        const shaders = scriptIds.map(id => this.shaderFromElement(id))
        return this.link(...shaders)
    }
    
    link(...shaders: Shader[]) {
        return new Program(this, shaders)
    }

    newBuffer(isDynamic: boolean = false) {
        return new Buffer(this, isDynamic)
    }

    newTexture(unit: number = 0) {
        return new Texture(this, unit)
    }

}

function getCanvas(canvasId: string): HTMLCanvasElement {
    const canvas = document.getElementById(canvasId)
    return canvas ? canvas as HTMLCanvasElement : failure(`No canvas found with ID: ${canvasId}`)
}

function getContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
    const context = canvas.getContext("webgl")
    return context ?? failure(`Failed to get GL context from element: ${canvas.id}`)
}
