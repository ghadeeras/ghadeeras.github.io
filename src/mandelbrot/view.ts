import { Vec } from "../../ether/latest/index.js"
import { viewGL } from "./view.gl.js"
import { required, viewGPU } from "./view.gpu.js"

export interface View {

    center: Vec<2>

    scale: number

    hue: number
    
    saturation: number

    setColor(h: number, s: number): void

    intensity: number

    palette: number

    juliaNumber: Vec<2>
    
}

export async function view(julia: boolean, canvasId: string, center: Vec<2>, scale: number): Promise<View> {
    const apiElement = required(document.getElementById("graphics-api"))
    try {
        const view = await viewGPU(julia, canvasId, center, scale)
        apiElement.innerHTML = "WebGPU"
        return view
    } catch (e) {
        apiElement.innerHTML = "WebGL"
        return await viewGL(julia, canvasId, center, scale)
    }
}
