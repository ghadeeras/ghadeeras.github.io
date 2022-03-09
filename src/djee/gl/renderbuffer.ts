import { Context } from "./context.js"
import { failure } from "../utils.js"

export type RenderBufferFormat = WebGL2RenderingContext[
    "DEPTH_COMPONENT16" | 
    "STENCIL_INDEX8" |
    "STENCIL_INDEX8" |
    "DEPTH_STENCIL" |
    "RGBA4" |
    "RGB565" |
    "RGB5_A1" |
    "RGB"
]

export class RenderBuffer {

    readonly glRenderBuffer: WebGLRenderbuffer
    readonly target = WebGL2RenderingContext.RENDERBUFFER
    
    constructor(
        readonly context: Context, 
        readonly format: RenderBufferFormat, 
        readonly width: number,
        readonly height: number
    ) {
        const gl = context.gl;
        this.glRenderBuffer = gl.createRenderbuffer() ?? failure("Failed to create a render buffer!")
        this.setStorage(format, width, height)
    }
    
    delete() {
        this.context.gl.deleteRenderbuffer(this.glRenderBuffer)
    }

    bind() {
        const gl = this.context.gl;
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.glRenderBuffer);
    }

    setStorage(format: number, width: number, height: number) {
        const gl = this.context.gl;
        this.bind();
        gl.renderbufferStorage(gl.RENDERBUFFER, format, width, height)
        return this
    }

}