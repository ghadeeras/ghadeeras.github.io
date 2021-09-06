import { Mat, Vec } from "../../ether/latest/index.js"
import * as glView from './view.gl.js' 
import * as gpuView from './view.gpu.js' 

export interface View {

    setMatModel(modelPositions: Mat<4>, modelNormals?: Mat<4>): void

    readonly matPositions: Mat<4>

    readonly matNormals: Mat<4>

    matView: Mat<4>

    matProjection: Mat<4>

    color: Vec<4>

    shininess: number

    lightPosition: Vec<4>

    lightRadius: number

    fogginess: number

    setMesh(primitives: GLenum, vertices: Float32Array): void

}

export async function newView(canvasId: string): Promise<View> {
    try {
        const view = await gpuView.newView(canvasId)
        console.log("Using WebGPU :-)")
        return view
    } catch (e) {
        console.log("Using WebGL :(")
        return await glView.newView(canvasId)
    }
}

export function asVec(array: number[] | Float32Array | Float64Array, offset: number = 0): Vec<4> {
    return [...array.slice(offset, offset + 4)] as Vec<4>
}

export function asMat(array: number[] | Float32Array | Float64Array, offset: number = 0): Mat<4> {
    return [
        asVec(array, offset +  0),
        asVec(array, offset +  4),
        asVec(array, offset +  8),
        asVec(array, offset + 12)
    ]
}

export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}
