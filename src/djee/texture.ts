import { Context } from "./context.js"
import { failure } from "./utils.js"

export type TextureFormat = 
    typeof WebGLRenderingContext.RGBA | 
    typeof WebGLRenderingContext.RGB | 
    typeof WebGLRenderingContext.LUMINANCE_ALPHA | 
    typeof WebGLRenderingContext.LUMINANCE | 
    typeof WebGLRenderingContext.ALPHA

export type RawImage = {
    pixels: Uint8Array
    width: number
    height: number
    format: TextureFormat 
}

export class TextureTarget {

    static readonly texture2D: TextureTarget = new TextureTarget(WebGLRenderingContext.TEXTURE_2D)

    private constructor(readonly id: GLenum) {
    }

    bind(texture: Texture) {
        const gl = texture.context.gl
        gl.activeTexture(gl.TEXTURE0 + texture.unit)
        gl.bindTexture(this.id, texture.glTexture)
    }

    setImage(texture: Texture, image: RawImage, level: number | null = null) {
        const gl = texture.context.gl
        this.bind(texture)
        gl.texImage2D(
            this.id, 
            level ?? 0, 
            image.format, 
            image.width, 
            image.height, 
            0, 
            image.format, 
            gl.UNSIGNED_BYTE, 
            image.pixels
        )
        this.generateMipmap(gl, level)
    }

    setRGBAImage(texture: Texture, image: TexImageSource, level: number | null = null) {
        const gl = texture.context.gl
        this.bind(texture)
        gl.texImage2D(
            this.id, 
            level ?? 0, 
            gl.RGBA, 
            gl.RGBA, 
            gl.UNSIGNED_BYTE, 
            image
        )
        this.generateMipmap(gl, level)
    }

    private generateMipmap(gl: WebGLRenderingContext, level: number | null) {
        if (level == null) {
            gl.generateMipmap(this.id)
        }
        gl.texParameteri(this.id, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(this.id, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    }

}

export class Texture {

    readonly glTexture: WebGLTexture

    constructor(readonly context: Context, readonly unit: number = 0) {
        const gl = context.gl
        this.glTexture = gl.createTexture() ?? failure(`Failed to create GL texture in context: ${this.context.canvas.id}`)
    }

    delete() {
        this.context.gl.deleteTexture(this.glTexture)
    }

}
