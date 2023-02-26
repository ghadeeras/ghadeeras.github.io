import { aether } from "/gen/libs.js"
import { viewGL } from "./view.gl.js"
import { required, viewGPU } from "./view.gpu.js"

export interface View {

    canvas: HTMLCanvasElement

    center: aether.Vec<2>

    scale: number

    hue: number
    
    saturation: number

    intensity: number

    xray: boolean

    crosshairs: boolean

    setColor(h: number, s: number): void

    render(): void

}

export async function view(canvasId: string, center: aether.Vec<2>, scale: number): Promise<View> {
    const apiElement = required(document.getElementById("graphics-api"))
    try {
        const view = await viewGPU(canvasId, center, scale)
        apiElement.innerHTML = "WebGPU"
        return view
    } catch (e) {
        console.warn("Falling back to WebGL because of exception!", e)
        apiElement.innerHTML = "WebGL"
        return await viewGL(canvasId, center, scale)
    }
}
