import * as gear from "../../gear/latest/index.js"
import * as ether from "../../ether/latest/index.js"
import * as djee from "../djee/all.js"
import { GLView } from "./view.gl.js"
import { Picker } from "./view.js"

export class GLPicker implements Picker {

    private program: djee.Program
    private frameBuffer: djee.FrameBuffer
    private posAttribute: djee.Attribute
    private mvpMatrixUniform: djee.Uniform

    constructor(
        private mainView: GLView,
        vertexShader: string,
        fragmentShader: string,
        private vertices: () => djee.AttributesBuffer,
    ) {
        const context = mainView.context

        this.program = context.link(
            context.shader(djee.ShaderType.VertexShader, vertexShader),
            context.shader(djee.ShaderType.FragmentShader, fragmentShader),
        )
        this.program.use()

        this.posAttribute = this.program.attribute("aModelPos")
        this.mvpMatrixUniform = this.program.uniform("mvpMat")

        const canvas = context.canvas
        const colorTexture = context.newTexture2D()
        colorTexture.setRawImage({
            format: WebGLRenderingContext.RGBA,
            width: canvas.width,
            height: canvas.height
        })
        this.frameBuffer = context.newFrameBuffer()
        this.frameBuffer.colorBuffer = colorTexture
        this.frameBuffer.depthBuffer = context.newRenderBuffer(
            WebGLRenderingContext.DEPTH_COMPONENT16, 
            canvas.width, 
            canvas.height
        )

        this.unbind()
    }

    private bind() {
        const gl = this.mainView.context.gl
        gl.enable(gl.DEPTH_TEST)
        gl.clearColor(0, 0, 0, 0)
        gl.clearDepth(1)
        this.program.use()
        this.frameBuffer.bind()
    }

    private unbind() {
        this.frameBuffer.unbind()
        this.mainView.bind()
    }

    async pick(matModelViewProjection: ether.Mat<4>, x: number, y: number): Promise<ether.Vec4> {
        this.bind()

        this.mvpMatrixUniform.data = new Float32Array(ether.mat4.columnMajorArray(matModelViewProjection))
        this.posAttribute.pointTo(this.vertices())

        const context = this.mainView.context

        context.gl.clear(WebGLRenderingContext.COLOR_BUFFER_BIT | WebGLRenderingContext.DEPTH_BUFFER_BIT)

        context.gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, this.vertices().count)

        const coordinatesAsColor = new Uint8Array(4)
        context.gl.readPixels(
            context.canvas.width * (x + 1) / 2, 
            context.canvas.height * (y + 1) / 2, 
            1, 1,
            WebGLRenderingContext.RGBA,
            WebGLRenderingContext.UNSIGNED_BYTE,
            coordinatesAsColor
        )

        this.unbind()
        return Promise.resolve(ether.vec4.sub(ether.vec4.scale(ether.vec4.from(coordinatesAsColor), 2 / 255), [1, 1, 1, 1]))
    }

}

export async function picker(mainView: GLView, vertices: () => djee.AttributesBuffer): Promise<Picker> {
    const shaders = await gear.fetchTextFiles({
        vertexShader: "picker.vert", 
        fragmentShader: "picker.frag"
    }, "/shaders")
    return new GLPicker(mainView, shaders.vertexShader, shaders.fragmentShader, vertices)
}
