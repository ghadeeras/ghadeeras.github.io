import type { Vec2 } from "aether"
import { required } from "gear"
import { viewGL, viewGPU } from "./view.gpu.js"

export interface View {

    canvas: HTMLCanvasElement

    center: Vec2

    scale: number

    hue: number
    
    saturation: number

    intensity: number

    xray: boolean

    crosshairs: boolean

    setColor(h: number, s: number): void

    render(): void

    resize(): void

}

export async function view(canvasId: string, center: Vec2, scale: number): Promise<View> {
    const apiElement = required(document.getElementById("graphics-api"))
    if (new URL(location.href).searchParams.has("webgl")) {
        apiElement.innerHTML = "WebGL"
        return await viewGL(canvasId, center, scale)
    }
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
