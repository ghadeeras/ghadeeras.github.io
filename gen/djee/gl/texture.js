import { failure } from "../utils.js";
export class TextureTarget {
    constructor(id) {
        this.id = id;
    }
}
TextureTarget.texture2D = new TextureTarget(WebGLRenderingContext.TEXTURE_2D);
export class Texture2D {
    constructor(context, unit = 0) {
        var _a;
        this.context = context;
        this.unit = unit;
        this.target = WebGLRenderingContext.TEXTURE_2D;
        const gl = context.gl;
        this.glTexture = (_a = gl.createTexture()) !== null && _a !== void 0 ? _a : failure(`Failed to create GL texture in context: ${this.context.canvas.id}`);
    }
    delete() {
        this.context.gl.deleteTexture(this.glTexture);
    }
    bind() {
        const gl = this.context.gl;
        gl.activeTexture(gl.TEXTURE0 + this.unit);
        gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, this.glTexture);
    }
    setRawImage(image, level = null) {
        var _a;
        const gl = this.context.gl;
        this.bind();
        gl.texImage2D(this.target, level !== null && level !== void 0 ? level : 0, image.format, image.width, image.height, 0, image.format, gl.UNSIGNED_BYTE, (_a = image.pixels) !== null && _a !== void 0 ? _a : null);
        if (image.pixels) {
            this.optimize(level == null);
        }
        return this;
    }
    setImageSource(image, level = null) {
        const gl = this.context.gl;
        this.bind();
        gl.texImage2D(WebGLRenderingContext.TEXTURE_2D, level !== null && level !== void 0 ? level : 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        this.optimize(level == null);
        return this;
    }
    optimize(mipmap) {
        const gl = this.context.gl;
        if (mipmap) {
            gl.generateMipmap(WebGLRenderingContext.TEXTURE_2D);
        }
        gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    }
}
//# sourceMappingURL=texture.js.map