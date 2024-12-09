import * as aether from "aether"
import * as gear from "gear"
import { wgl } from "lumen"
import * as v from "./view.js"
import { picker } from "./picker.gl.js"

const projection = new aether.PerspectiveProjection(1, null, false, true)

export class GLView implements v.View {

    readonly context: wgl.Context
    readonly program: wgl.Program

    private position: wgl.Attribute
    private normal: wgl.Attribute

    private _matModelPositions: wgl.Uniform
    private _matModelNormals: wgl.Uniform
    private _matProjection: wgl.Uniform

    private _color: wgl.Uniform
    private _shininess: wgl.Uniform

    private _lightPosition: wgl.Uniform
    private _lightRadius: wgl.Uniform
    private _fogginess: wgl.Uniform
    
    private _vertices: wgl.AttributesBuffer
    private _primitives: GLenum

    private _matPositions: aether.Mat<4> = aether.mat4.identity()
    private _matNormals: aether.Mat<4> = aether.mat4.identity()
    private _matView: aether.Mat<4> = aether.mat4.identity()
    private _globalLightPosition: aether.Vec<4> = [2, 2, 2, 1]

    private _focalLength = 2
    private _aspectRatio = 1

    constructor(
        canvasId: string,
        vertexShaderCode: string,
        fragmentShaderCode: string
    ) {
        this.context = wgl.Context.of(canvasId)
        this.program = this.context.link(
            this.context.vertexShader(vertexShaderCode),
            this.context.fragmentShader(fragmentShaderCode)
        )
        this.program.use()

        this.position = this.program.attribute("position")
        this.normal = this.program.attribute("normal")

        this._matModelPositions = this.program.uniform("positionsMat")
        this._matModelNormals = this.program.uniform("normalsMat")
        this._matProjection = this.program.uniform("projectionMat")
    
        this._color = this.program.uniform("color")
        this._shininess = this.program.uniform("shininess")

        this._lightPosition = this.program.uniform("lightPosition")
        this._lightRadius = this.program.uniform("lightRadius")
        this._fogginess = this.program.uniform("fogginess")

        this._matModelPositions.data = aether.mat4.columnMajorArray(aether.mat4.identity())
        this._matModelNormals.data = aether.mat4.columnMajorArray(aether.mat4.identity())
        this._matView = aether.mat4.identity()
        this._matProjection.data = aether.mat4.columnMajorArray(aether.mat4.identity())

        this._color.data = [0.2, 0.4, 0.8, 1.0]
        this._shininess.data = [0.5]

        this._globalLightPosition = [2, 2, 2, 1]
        this._lightPosition.data = [2, 2, 2]
        this._lightRadius.data = [0.1]
        this._fogginess.data = [0.1]

        const gl = this.context.gl

        this._vertices = this.context.newAttributesBuffer(6 * 4, true)
        this._primitives = gl.TRIANGLES

        this.position.pointTo(this._vertices)
        this.normal.pointTo(this._vertices, 3 * 4)

        this.bind()
    }

    picker(): Promise<v.Picker> {
        return picker(this, () => this._vertices)
    }

    resize() {
        this._aspectRatio = this.context.canvas.width / this.context.canvas.height
        this.matProjection = projection.matrix(this._focalLength, this._aspectRatio)
        this.context.gl.viewport(0, 0, this.context.canvas.width, this.context.canvas.height)
    }

    render() {
        const gl = this.context.gl
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.drawArrays(this._primitives, 0, this._vertices.data.length / 6)
        gl.flush()
    }

    bind() {
        this.program.use()
        const gl = this.context.gl
        gl.enable(gl.DEPTH_TEST)
        gl.clearDepth(1)
        gl.clearColor(1, 1, 1, 1)
    }

    setMatModel(modelPositions: aether.Mat<4>, modelNormals: aether.Mat<4> = aether.mat4.transpose(aether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions
        this._matNormals = modelNormals

        this._matModelPositions.data = aether.mat4.columnMajorArray(aether.mat4.mul(this._matView, modelPositions))
        this._matModelNormals.data = modelPositions === modelNormals ? 
            this._matModelPositions.data :
            aether.mat4.columnMajorArray(aether.mat4.mul(this._matView, modelNormals))
    }

    setMesh(primitives: GLenum, vertices: Float32Array) {
        this._primitives = primitives
        this._vertices.data = vertices
    }

    get canvas(): HTMLCanvasElement {
        return this.context.canvas
    }

    get matPositions(): aether.Mat<4> {
        return this._matPositions
    }

    get matNormals(): aether.Mat<4> {
        return this._matNormals
    }

    get matView(): aether.Mat<4> {
        return this._matView
    }    

    set matView(m: aether.Mat<4>) {
        this._matView = m
        this.lightPosition = this._globalLightPosition
    }    

    get focalLength() {
        return this._focalLength
    }

    set focalLength(l: number) {
        this._focalLength = l
        this.matProjection = projection.matrix(this._focalLength, this._aspectRatio)
    }

    get matProjection(): aether.Mat<4> {
        return aether.mat4.from(this._matProjection.data)
    }

    private set matProjection(m: aether.Mat<4>) {
        this._matProjection.data = aether.mat4.columnMajorArray(m)
    }

    get color(): aether.Vec<4> {
        return aether.vec4.from(this._color.data)
    }

    set color(c: aether.Vec<4>) {
        this._color.data = c
    }

    get shininess(): number {
        return this._shininess.data[0]
    }

    set shininess(s: number) {
        this._shininess.data = [s]
    }

    get lightPosition(): aether.Vec<4> {
        return this._globalLightPosition
    }

    set lightPosition(p: aether.Vec<4>) {
        this._globalLightPosition = p
        this._lightPosition.data = aether.vec4.add(this._matView[3], p).slice(0, 3)
    }

    get lightRadius(): number {
        return this._lightRadius.data[0]
    }

    set lightRadius(s: number) {
        this._lightRadius.data = [s]
    }

    get fogginess(): number {
        return this._fogginess.data[0]
    }

    set fogginess(f: number) {
        this._fogginess.data = [f]
    }

}

export async function newView(canvasId: string): Promise<v.View> {
    const shaders = await gear.fetchTextFiles({
        vertexShader: "generic.vert", 
        fragmentShader: "generic.frag"
    }, "/shaders")
    return new GLView(canvasId, shaders.vertexShader, shaders.fragmentShader)
}
