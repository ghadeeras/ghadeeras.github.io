import { Shader, ShaderType } from "./shader.js"
import { Program } from "./program.js"
import { AttributesBuffer, IndicesBuffer } from "./buffer.js"
import { failure } from "../utils.js"
import { Texture2D } from "./texture.js"
import { RenderBuffer, RenderBufferFormat } from "./renderbuffer.js"
import { FrameBuffer } from "./framebuffer.js"

export class Context {

    readonly canvas: HTMLCanvasElement
    readonly gl: WebGL2RenderingContext

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

    newAttributesBuffer(byteStride: number = 0, isDynamic: boolean = false) {
        return new AttributesBuffer(this, byteStride, isDynamic)
    }

    newIndicesBuffer(isDynamic: boolean = false) {
        return new IndicesBuffer(this, isDynamic)
    }

    newTexture2D(unit: number = 0) {
        return new Texture2D(this, unit)
    }

    newRenderBuffer(format: RenderBufferFormat, width: number, height: number) {
        return new RenderBuffer(this, format, width, height)
    }

    newFrameBuffer() {
        return new FrameBuffer(this)
    }

}

function getCanvas(canvasId: string): HTMLCanvasElement {
    const canvas = document.getElementById(canvasId)
    return canvas ? canvas as HTMLCanvasElement : failure(`No canvas found with ID: ${canvasId}`)
}

function getContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const context = canvas.getContext("webgl2")
    return context ?? failure(`Failed to get GL context from element: ${canvas.id}`)
}
