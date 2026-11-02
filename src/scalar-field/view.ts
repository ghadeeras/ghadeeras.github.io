import type { Mat4, Vec4 } from "aether"
import * as gear from "gear"
import * as gpuView from './view.gpu.js'

export interface View {

    readonly canvas: HTMLCanvasElement

    readonly matProjection: Mat4

    readonly matPositions: Mat4

    readonly matNormals: Mat4

    matView: Mat4

    focalLength: number

    color: Vec4

    backgroundColor: Vec4

    shininess: number

    lightPosition: Vec4

    lightRadius: number

    fogginess: number

    setMatModel(modelPositions: Mat4, modelNormals?: Mat4): void

    setMesh(primitives: GLenum, vertices: Float32Array): void

    picker(): Promise<Picker>

    resize(): void

    render(): void

}

export interface Picker {

    pick(matModelViewProjection: Mat4, x: number, y: number): Promise<Vec4>

    resize(): void

}

export async function newView(canvasId: string): Promise<View> {
    const apiElement = gear.required(document.getElementById("graphics-api"))
    if (new URL(location.href).searchParams.has("webgl")) {
        apiElement.innerHTML = "WebGL"
        return await gpuView.newGLView(canvasId)
    }
    try {
        const view = await gpuView.newView(canvasId)
        apiElement.innerHTML = "WebGPU"
        return view
    } catch (e) {
        console.warn("Falling back to WebGL because of exception!", e)
        apiElement.innerHTML = "WebGL"
        return await gpuView.newGLView(canvasId)
    }
}
