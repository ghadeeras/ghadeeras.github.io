import { Context } from "./context.js"
import { failure } from "../utils.js"

export type TextureFormat = WebGLRenderingContext[
    "RGBA" | 
    "RGB" | 
    "LUMINANCE_ALPHA" | 
    "LUMINANCE" | 
    "ALPHA"
]

export type RawImage = {
    pixels?: Uint8Array
    width: number
    height: number
    format: TextureFormat 
}

export class TextureTarget {

    static readonly texture2D: TextureTarget = new TextureTarget(WebGLRenderingContext.TEXTURE_2D)

    private constructor(readonly id: GLenum) {
    }

}

export class Texture2D {

    readonly target = WebGLRenderingContext.TEXTURE_2D
    readonly glTexture: WebGLTexture

    constructor(readonly context: Context, readonly unit: number = 0) {
        const gl = context.gl
        this.glTexture = gl.createTexture() ?? failure(`Failed to create GL texture in context: ${this.context.canvas.id}`)
    }

    delete() {
        this.context.gl.deleteTexture(this.glTexture)
    }

    bind() {
        const gl = this.context.gl
        gl.activeTexture(gl.TEXTURE0 + this.unit)
        gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, this.glTexture)
    }

    setRawImage(image: RawImage, level: number | null = null) {
        const gl = this.context.gl
        this.bind()
        gl.texImage2D(
            this.target, 
            level ?? 0, 
            image.format, 
            image.width, 
            image.height, 
            0, 
            image.format, 
            gl.UNSIGNED_BYTE, 
            image.pixels ?? null
        )
        if (image.pixels) {
            this.optimize(level == null)
        }
        return this
    }

    setImageSource(image: TexImageSource, level: number | null = null) {
        const gl = this.context.gl
        this.bind()
        gl.texImage2D(
            WebGLRenderingContext.TEXTURE_2D, 
            level ?? 0, 
            gl.RGBA, 
            gl.RGBA, 
            gl.UNSIGNED_BYTE, 
            image
        )
        this.optimize(level == null)
        return this
    }

    private optimize(mipmap: boolean) {
        const gl = this.context.gl
        if (mipmap) {
            gl.generateMipmap(WebGLRenderingContext.TEXTURE_2D)
        }
        gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    }

}
