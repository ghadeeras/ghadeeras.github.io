import * as aether from "aether"
import * as gear from "gear"
import * as glView from './view.gl.js' 
import * as gpuView from './view.gpu.js' 

export interface View {

    readonly canvas: HTMLCanvasElement

    readonly matProjection: aether.Mat<4>

    readonly matPositions: aether.Mat<4>

    readonly matNormals: aether.Mat<4>

    matView: aether.Mat<4>

    focalLength: number

    color: aether.Vec<4>

    shininess: number

    lightPosition: aether.Vec<4>

    lightRadius: number

    fogginess: number

    setMatModel(modelPositions: aether.Mat<4>, modelNormals?: aether.Mat<4>): void

    setMesh(primitives: GLenum, vertices: Float32Array): void

    picker(): Promise<Picker>

    resize(): void

    render(): void

}

export interface Picker {

    pick(matModelViewProjection: aether.Mat<4>, x: number, y: number): Promise<aether.Vec4>

    resize(): void

}

export async function newView(canvasId: string): Promise<View> {
    const apiElement = gear.required(document.getElementById("graphics-api"))
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
