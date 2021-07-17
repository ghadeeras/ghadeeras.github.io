import { RenderBuffer } from "./renderbuffer.js";
import { failure } from "./utils.js";
export class FrameBuffer {
    constructor(context) {
        var _a;
        this.context = context;
        this.target = WebGLRenderingContext.FRAMEBUFFER;
        this._colorBuffer = null;
        this._depthBuffer = null;
        this.glFrameBuffer = (_a = context.gl.createFramebuffer()) !== null && _a !== void 0 ? _a : failure("Failed to create a frame buffer!");
    }
    delete() {
        this.context.gl.deleteFramebuffer(this.glFrameBuffer);
    }
    bind() {
        const gl = this.context.gl;
        gl.bindFramebuffer(this.target, this.glFrameBuffer);
    }
    get colorBuffer() {
        return this._colorBuffer;
    }
    set colorBuffer(buffer) {
        this._colorBuffer = this.set(WebGLRenderingContext.COLOR_ATTACHMENT0, buffer, this._colorBuffer);
    }
    get depthBuffer() {
        return this._depthBuffer;
    }
    set depthBuffer(buffer) {
        this._depthBuffer = this.set(WebGLRenderingContext.DEPTH_ATTACHMENT, buffer, this._depthBuffer);
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