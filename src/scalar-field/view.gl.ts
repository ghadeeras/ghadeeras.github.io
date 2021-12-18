import { ether, gear } from "/gen/libs.js"
import * as djee from "../djee/all.js"
import * as v from "./view.js"
import { picker } from "./picker.gl.js"

export class GLView implements v.View {

    readonly context: djee.Context
    readonly program: djee.Program

    private position: djee.Attribute
    private normal: djee.Attribute

    private _matModelPositions: djee.Uniform
    private _matModelNormals: djee.Uniform
    private _matProjection: djee.Uniform

    private _color: djee.Uniform
    private _shininess: djee.Uniform

    private _lightPosition: djee.Uniform
    private _lightRadius: djee.Uniform
    private _fogginess: djee.Uniform
    
    private _vertices: djee.AttributesBuffer
    private _primitives: GLenum

    private _frame: null | (() => void) = null

    private _matPositions: ether.Mat<4> = ether.mat4.identity()
    private _matNormals: ether.Mat<4> = ether.mat4.identity()
    private _matView: ether.Mat<4> = ether.mat4.identity()
    private _globalLightPosition: ether.Vec<4> = [2, 2, 2, 1]

    constructor(
        canvasId: string,
        vertexShaderCode: string,
        fragmentShaderCode: string
    ) {
        this.context = djee.Context.of(canvasId)
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

        this._matModelPositions.data = ether.mat4.columnMajorArray(ether.mat4.identity())
        this._matModelNormals.data = ether.mat4.columnMajorArray(ether.mat4.identity())
        this._matView = ether.mat4.identity()
        this._matProjection.data = ether.mat4.columnMajorArray(ether.mat4.identity())

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

    bind() {
        this.program.use()
        const gl = this.context.gl
        gl.enable(gl.DEPTH_TEST)
        gl.clearDepth(1)
        gl.clearColor(1, 1, 1, 1)
    }

    setMatModel(modelPositions: ether.Mat<4>, modelNormals: ether.Mat<4> = ether.mat4.transpose(ether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions
        this._matNormals = modelNormals

        this._matModelPositions.data = ether.mat4.columnMajorArray(ether.mat4.mul(this._matView, modelPositions))
        this._matModelNormals.data = modelPositions === modelNormals ? 
            this._matModelPositions.data :
            ether.mat4.columnMajorArray(ether.mat4.mul(this._matView, modelNormals))
    }

    get matPositions(): ether.Mat<4> {
        return this._matPositions
    }

    get matNormals(): ether.Mat<4> {
        return this._matNormals
    }

    get matView(): ether.Mat<4> {
        return this._matView
    }    

    set matView(m: ether.Mat<4>) {
        this._matView = m
        this.lightPosition = this._globalLightPosition
    }    

    get matProjection(): ether.Mat<4> {
        return ether.mat4.from(this._matProjection.data)
    }

    set matProjection(m: ether.Mat<4>) {
        this._matProjection.data = ether.mat4.columnMajorArray(m)
    }

    get color(): ether.Vec<4> {
        return ether.vec4.from(this._color.data)
    }

    set color(c: ether.Vec<4>) {
        this._color.data = c
    }

    get shininess(): number {
        return this._shininess.data[0]
    }

    set shininess(s: number) {
        this._shininess.data = [s]
    }

    get lightPosition(): ether.Vec<4> {
        return this._globalLightPosition
    }

    set lightPosition(p: ether.Vec<4>) {
        this._globalLightPosition = p
        this._lightPosition.data = ether.vec4.add(this._matView[3], p).slice(0, 3)
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

    setMesh(primitives: GLenum, vertices: Float32Array) {
        this._primitives = primitives
        this._vertices.data = vertices

        if (!this._frame) {
            this._frame = () => {
                const gl = this.context.gl
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
                gl.drawArrays(this._primitives, 0, this._vertices.data.length / 6)
                if (this._frame) {
                    requestAnimationFrame(this._frame)
                }
                gl.flush()
            }
            this._frame()
        }
    }

}

export async function newView(canvasId: string): Promise<v.View> {
    const shaders = await gear.fetchTextFiles({
        vertexShader: "generic.vert", 
        fragmentShader: "generic.frag"
    }, "/shaders")
    return new GLView(canvasId, shaders.vertexShader, shaders.fragmentShader)
}
