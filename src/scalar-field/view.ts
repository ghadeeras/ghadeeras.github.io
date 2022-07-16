import { aether, gear } from "/gen/libs.js"
import * as glView from './view.gl.js' 
import * as gpuView from './view.gpu.js' 
import { required } from "../utils/misc.js"

export interface View {

    setMatModel(modelPositions: aether.Mat<4>, modelNormals?: aether.Mat<4>): void

    readonly matPositions: aether.Mat<4>

    readonly matNormals: aether.Mat<4>

    matView: aether.Mat<4>

    matProjection: aether.Mat<4>

    color: aether.Vec<4>

    shininess: number

    lightPosition: aether.Vec<4>

    lightRadius: number

    fogginess: number

    setMesh(primitives: GLenum, vertices: Float32Array): void

    picker(): Promise<Picker>

}

export interface Picker {

    pick(matModelViewProjection: aether.Mat<4>, x: number, y: number): Promise<aether.Vec4>

}

export type ViewInputs = {

    matModel: gear.Value<aether.Mat<4>>

    matView: gear.Value<aether.Mat<4>>

    matProjection: gear.Value<aether.Mat<4>>

    color: gear.Value<aether.Vec<4>>

    shininess: gear.Value<number>

    lightPosition: gear.Value<aether.Vec<4>>

    lightRadius: gear.Value<number>

    fogginess: gear.Value<number>

    vertices: gear.Value<Float32Array>

}

export function wire(view: View, inputs: ViewInputs, primitives: GLenum = WebGL2RenderingContext.TRIANGLES) {
    inputs.matModel.attach(mat => view.setMatModel(mat, mat))
    inputs.matView.attach(mat => view.matView = mat)
    inputs.matProjection.attach(mat => view.matProjection = mat)
    inputs.color.attach(c => view.color = c)
    inputs.shininess.attach(s => view.shininess = s)
    inputs.lightPosition.attach(pos => view.lightPosition = pos)
    inputs.lightRadius.attach(r => view.lightRadius = r)
    inputs.fogginess.attach(f => view.fogginess = f)
    inputs.vertices.attach(v => view.setMesh(primitives, v))
}

export async function newView(canvasId: string): Promise<View> {
    const apiElement = required(document.getElementById("graphics-api"))
    try {
        const view = await gpuView.newView(canvasId)
        apiElement.innerHTML = "WebGPU"
        return view
    } catch (e) {
        console.warn("Falling back to WebGL because of exception!", e)
        apiElement.innerHTML = "WebGL"
        return await glView.newView(canvasId)
    }
}
