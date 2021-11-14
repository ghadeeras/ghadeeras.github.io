import { Context } from "./context.js";
import { RenderBuffer } from "./renderbuffer.js";
import { Texture2D } from "./texture.js";
import { failure } from "./utils.js";

export class FrameBuffer {

    readonly target = WebGLRenderingContext.FRAMEBUFFER
    readonly glFrameBuffer: WebGLFramebuffer

    private _colorBuffer: RenderBuffer | Texture2D | null = null
    private _depthBuffer: RenderBuffer | Texture2D | null = null
    
    constructor(readonly context: Context) {
        this.glFrameBuffer = context.gl.createFramebuffer() ?? failure("Failed to create a frame buffer!")
    }

    delete() {
        this.context.gl.deleteFramebuffer(this.glFrameBuffer)
    }

    bind() {
        const gl = this.context.gl;
        gl.bindFramebuffer(this.target, this.glFrameBuffer)
    }

    unbind() {
        const gl = this.context.gl;
        gl.bindFramebuffer(this.target, null)
    }

    check() {
        this.bind()
        const result = this.context.gl.checkFramebufferStatus(this.target)
        if (result !== WebGLRenderingContext.FRAMEBUFFER_COMPLETE) {
            failure("Frame buffer is in an incomplete status!")
        }   
    }

    get colorBuffer() {
        return this._colorBuffer
    }

    set colorBuffer(buffer: RenderBuffer | Texture2D | null) {
        this._colorBuffer = this.set(WebGLRenderingContext.COLOR_ATTACHMENT0, buffer, this._colorBuffer)
    }

    get depthBuffer() {
        return this._depthBuffer
    }

    set depthBuffer(buffer: RenderBuffer | Texture2D | null) {
        this._depthBuffer = this.set(WebGLRenderingContext.DEPTH_ATTACHMENT, buffer, this._depthBuffer)
    }

    private set(attachment: number, newBuffer: RenderBuffer | Texture2D | null, oldBuffer: RenderBuffer | Texture2D | null) {
        const gl = this.context.gl;
        this.bind()
        if (newBuffer !== oldBuffer) {
            if (oldBuffer != null) {
                if (oldBuffer instanceof RenderBuffer) {
                    gl.framebufferRenderbuffer(this.target, attachment, oldBuffer.target, null)
                } else {
                    gl.framebufferTexture2D(this.target, attachment, oldBuffer.target, null, 0)
                }
            }
            if (newBuffer != null) {
                newBuffer.bind()
                if (newBuffer instanceof RenderBuffer) {
                    gl.framebufferRenderbuffer(this.target, attachment, newBuffer.target, newBuffer.glRenderBuffer)
                } else {
                    gl.framebufferTexture2D(this.target, attachment, newBuffer.target, newBuffer.glTexture, 0)
                }
            }
        }
        return newBuffer
    }

}