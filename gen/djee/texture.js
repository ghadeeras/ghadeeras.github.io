import { failure } from "./utils.js";
export class TextureTarget {
    constructor(id) {
        this.id = id;
    }
    bind(texture) {
        const gl = texture.context.gl;
        gl.activeTexture(gl.TEXTURE0 + texture.unit);
        gl.bindTexture(this.id, texture.glTexture);
    }
    setImage(texture, image, level = null) {
        const gl = texture.context.gl;
        this.bind(texture);
        gl.texImage2D(this.id, level !== null && level !== void 0 ? level : 0, image.format, image.width, image.height, 0, image.format, gl.UNSIGNED_BYTE, image.pixels);
        this.generateMipmap(gl, level);
    }
    setRGBAImage(texture, image, level = null) {
        const gl = texture.context.gl;
        this.bind(texture);
        gl.texImage2D(this.id, level !== null && level !== void 0 ? level : 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        this.generateMipmap(gl, level);
    }
    generateMipmap(gl, level) {
        if (level == null) {
            gl.generateMipmap(this.id);
        }
        gl.texParameteri(this.id, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(this.id, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
}
TextureTarget.texture2D = new TextureTarget(WebGLRenderingContext.TEXTURE_2D);
export class Texture {
    constructor(context, unit = 0) {
        var _a;
        this.context = context;
        this.unit = unit;
        const gl = context.gl;
        this.glTexture = (_a = gl.createTexture()) !== null && _a !== void 0 ? _a : failure(`Failed to create GL texture in context: ${this.context.canvas.id}`);
    }
    delete() {
        this.context.gl.deleteTexture(this.glTexture);
    }
}
//# sourceMappingURL=texture.js.map