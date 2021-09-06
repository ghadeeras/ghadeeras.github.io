import * as Djee from "../djee/all.js"
import * as Ether from "../../ether/latest/index.js"
import * as Gear from "../gear/all.js"
import * as gltf from "../djee/gltf.js"
import { Mat, mat4, Vec, vec3 } from "../../ether/latest/index.js"
import * as v from "./view.js"

export class GLView implements v.View {

    private context: Djee.Context
    private program: Djee.Program

    private position: Djee.Attribute
    private normal: Djee.Attribute

    private _matModelPositions: Djee.Uniform
    private _matModelNormals: Djee.Uniform
    private _matProjection: Djee.Uniform

    private _color: Djee.Uniform
    private _shininess: Djee.Uniform

    private _lightPosition: Djee.Uniform
    private _lightRadius: Djee.Uniform
    private _fogginess: Djee.Uniform
    
    private _vertices: Djee.AttributesBuffer
    private _primitives: GLenum

    private _frame: null | (() => void) = null

    private _matPositions: Mat<4> = mat4.identity()
    private _matNormals: Mat<4> = mat4.identity()
    private _matView: Mat<4> = mat4.identity()
    private _globalLightPosition: Vec<4> = [2, 2, 2, 1]

    constructor(
        canvasId: string,
        vertexShaderCode: string,
        fragmentShaderCode: string
    ) {
        this.context = Djee.Context.of(canvasId)
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

        this._matModelPositions.data = mat4.columnMajorArray(mat4.identity())
        this._matModelNormals.data = mat4.columnMajorArray(mat4.identity())
        this._matView = mat4.identity()
        this._matProjection.data = mat4.columnMajorArray(mat4.identity())

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

        gl.enable(gl.DEPTH_TEST)
        gl.clearDepth(1)
        gl.clearColor(1, 1, 1, 1)
    }

    setMatModel(modelPositions: Mat<4>, modelNormals: Mat<4> = mat4.transpose(mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions
        this._matNormals = modelNormals

        this._matModelPositions.data = mat4.columnMajorArray(mat4.mul(this._matView, modelPositions))
        this._matModelNormals.data = modelPositions === modelNormals ? 
            this._matModelPositions.data :
            mat4.columnMajorArray(mat4.mul(this._matView, modelNormals))
    }

    get matPositions(): Mat<4> {
        return this._matPositions
    }

    get matNormals(): Mat<4> {
        return this._matNormals
    }

    get matView(): Mat<4> {
        return this._matView
    }    

    set matView(m: Mat<4>) {
        this._matView = m
        this.lightPosition = this._globalLightPosition
    }    

    get matProjection(): Mat<4> {
        return v.asMat(this._matProjection.data)
    }

    set matProjection(m: Mat<4>) {
        this._matProjection.data = mat4.columnMajorArray(m)
    }

    get color(): Vec<4> {
        return v.asVec(this._color.data)
    }

    set color(c: Vec<4>) {
        this._color.data = c
    }

    get shininess(): number {
        return this._shininess.data[0]
    }

    set shininess(s: number) {
        this._shininess.data = [s]
    }

    get lightPosition(): Vec<4> {
        return this._globalLightPosition
    }

    set lightPosition(p: Vec<4>) {
        this._globalLightPosition = p
        this._lightPosition.data = mat4.apply(this._matView, p).slice(0, 3)
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
    const shaders = await Gear.fetchFiles({
        vertexShader: "generic.vert", 
        fragmentShader: "generic.frag"
    }, "/shaders")
    return new GLView(canvasId, shaders.vertexShader, shaders.fragmentShader)
}
