import { aether, gear } from "/gen/libs.js"
import { wgl } from "../djee/index.js"
import { GLView } from "./view.gl.js"
import { Picker } from "./view.js"

export class GLPicker implements Picker {

    private program: wgl.Program
    private frameBuffer: wgl.FrameBuffer
    private posAttribute: wgl.Attribute
    private mvpMatrixUniform: wgl.Uniform

    constructor(
        private mainView: GLView,
        vertexShader: string,
        fragmentShader: string,
        private vertices: () => wgl.AttributesBuffer,
    ) {
        const context = mainView.context

        this.program = context.link(
            context.shader(wgl.ShaderType.VertexShader, vertexShader),
            context.shader(wgl.ShaderType.FragmentShader, fragmentShader),
        )
        this.program.use()

        this.posAttribute = this.program.attribute("aModelPos")
        this.mvpMatrixUniform = this.program.uniform("mvpMat")

        const canvas = context.canvas
        const colorTexture = context.newTexture2D()
        colorTexture.setRawImage({
            format: WebGL2RenderingContext.RGBA,
            width: canvas.width,
            height: canvas.height
        })
        this.frameBuffer = context.newFrameBuffer()
        this.frameBuffer.colorBuffer = colorTexture
        this.frameBuffer.depthBuffer = context.newRenderBuffer(
            WebGL2RenderingContext.DEPTH_COMPONENT16, 
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

    async pick(matModelViewProjection: aether.Mat<4>, x: number, y: number): Promise<aether.Vec4> {
        this.bind()

        this.mvpMatrixUniform.data = new Float32Array(aether.mat4.columnMajorArray(matModelViewProjection))
        this.posAttribute.pointTo(this.vertices())

        const context = this.mainView.context

        context.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT)

        context.gl.drawArrays(WebGL2RenderingContext.TRIANGLES, 0, this.vertices().count)

        const coordinatesAsColor = new Uint8Array(4)
        context.gl.readPixels(
            context.canvas.width * (x + 1) / 2, 
            context.canvas.height * (y + 1) / 2, 
            1, 1,
            WebGL2RenderingContext.RGBA,
            WebGL2RenderingContext.UNSIGNED_BYTE,
            coordinatesAsColor
        )

        this.unbind()
        return Promise.resolve(aether.vec4.sub(aether.vec4.scale(aether.vec4.from(coordinatesAsColor), 2 / 255), [1, 1, 1, 1]))
    }

}

export async function picker(mainView: GLView, vertices: () => wgl.AttributesBuffer): Promise<Picker> {
    const shaders = await gear.fetchTextFiles({
        vertexShader: "picker.vert", 
        fragmentShader: "picker.frag"
    }, "/shaders")
    return new GLPicker(mainView, shaders.vertexShader, shaders.fragmentShader, vertices)
}
