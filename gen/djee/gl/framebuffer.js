import { RenderBuffer } from "./renderbuffer.js";
import { failure } from "../utils.js";
export class FrameBuffer {
    constructor(context) {
        this.context = context;
        this.target = WebGL2RenderingContext.FRAMEBUFFER;
        this._colorBuffer = null;
        this._depthBuffer = null;
        this.glFrameBuffer = context.gl.createFramebuffer() ?? failure("Failed to create a frame buffer!");
    }
    delete() {
        this.context.gl.deleteFramebuffer(this.glFrameBuffer);
    }
    bind() {
        const gl = this.context.gl;
        gl.bindFramebuffer(this.target, this.glFrameBuffer);
    }
    unbind() {
        const gl = this.context.gl;
        gl.bindFramebuffer(this.target, null);
    }
    check() {
        this.bind();
        const result = this.context.gl.checkFramebufferStatus(this.target);
        if (result !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            failure("Frame buffer is in an incomplete status!");
        }
    }
    get colorBuffer() {
        return this._colorBuffer;
    }
    set colorBuffer(buffer) {
        this._colorBuffer = this.set(WebGL2RenderingContext.COLOR_ATTACHMENT0, buffer, this._colorBuffer);
    }
    get depthBuffer() {
        return this._depthBuffer;
    }
    set depthBuffer(buffer) {
        this._depthBuffer = this.set(WebGL2RenderingContext.DEPTH_ATTACHMENT, buffer, this._depthBuffer);
    }
    set(attachment, newBuffer, oldBuffer) {
        const gl = this.context.gl;
        this.bind();
        if (newBuffer !== oldBuffer) {
            if (oldBuffer != null) {
                if (oldBuffer instanceof RenderBuffer) {
                    gl.framebufferRenderbuffer(this.target, attachment, oldBuffer.target, null);
                }
                else {
                    gl.framebufferTexture2D(this.target, attachment, oldBuffer.target, null, 0);
                }
            }
            if (newBuffer != null) {
                newBuffer.bind();
                if (newBuffer instanceof RenderBuffer) {
                    gl.framebufferRenderbuffer(this.target, attachment, newBuffer.target, newBuffer.glRenderBuffer);
                }
                else {
                    gl.framebufferTexture2D(this.target, attachment, newBuffer.target, newBuffer.glTexture, 0);
                }
            }
        }
        return newBuffer;
    }
}
//# sourceMappingURL=framebuffer.js.map