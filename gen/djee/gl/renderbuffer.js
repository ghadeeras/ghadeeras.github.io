import { failure } from "../utils.js";
export class RenderBuffer {
    constructor(context, format, width, height) {
        var _a;
        this.context = context;
        this.format = format;
        this.width = width;
        this.height = height;
        this.target = WebGL2RenderingContext.RENDERBUFFER;
        const gl = context.gl;
        this.glRenderBuffer = (_a = gl.createRenderbuffer()) !== null && _a !== void 0 ? _a : failure("Failed to create a render buffer!");
        this.setStorage(format, width, height);
    }
    delete() {
        this.context.gl.deleteRenderbuffer(this.glRenderBuffer);
    }
    bind() {
        const gl = this.context.gl;
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.glRenderBuffer);
    }
    setStorage(format, width, height) {
        const gl = this.context.gl;
        this.bind();
        gl.renderbufferStorage(gl.RENDERBUFFER, format, width, height);
        return this;
    }
}
//# sourceMappingURL=renderbuffer.js.map