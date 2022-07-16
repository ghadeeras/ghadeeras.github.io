import { aether } from "/gen/libs.js"
import { viewGL } from "./view.gl.js"
import { required, viewGPU } from "./view.gpu.js"

export interface View {

    center: aether.Vec<2>

    scale: number

    hue: number
    
    saturation: number

    setColor(h: number, s: number): void

    intensity: number

    palette: number

    juliaNumber: aether.Vec<2>
    
}

export async function view(julia: boolean, canvasId: string, center: aether.Vec<2>, scale: number): Promise<View> {
    const apiElement = required(document.getElementById("graphics-api"))
    try {
        const view = await viewGPU(julia, canvasId, center, scale)
        apiElement.innerHTML = "WebGPU"
        return view
    } catch (e) {
        console.warn("Falling back to WebGL because of exception!", e)
        apiElement.innerHTML = "WebGL"
        return await viewGL(julia, canvasId, center, scale)
    }
}
