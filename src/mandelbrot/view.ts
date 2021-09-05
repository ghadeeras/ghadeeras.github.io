import { Vec } from "../../ether/latest/index.js"
import { fetchFiles } from "../gear/all.js"
import { ViewGL } from "./view.gl.js"
import { required, ViewGPU } from "./view.gpu.js"

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
    try {
        const view = await viewGPU(julia, canvasId, center, scale)
        console.log("Using WebGPU :-)")
        return view
    } catch (e) {
        console.log("Using WebGL :(")
        return await viewGL(julia, canvasId, center, scale)
    }
}

export async function viewGL(julia: boolean, canvasId: string, center: Vec<2>, scale: number): Promise<View> {
    const shaders = await fetchFiles({ 
        vertexShaderCode: "mandelbrot.vert", 
        fragmentShaderCode: "mandelbrot.frag"
    }, "/shaders")
    return new ViewGL(julia, canvasId, shaders.vertexShaderCode, shaders.fragmentShaderCode, center, scale)
}

export async function viewGPU(julia: boolean, canvasId: string, center: Vec<2>, scale: number): Promise<View> {
    const shaders = await fetchFiles({ 
        shaderCode: "mandelbrot.wgsl"
    }, "/shaders")
    const gpu = required(navigator.gpu)
    const adapter = required(await gpu.requestAdapter())
    const device = await adapter.requestDevice()
    return new ViewGPU(julia, device, adapter, canvasId, shaders.shaderCode, center, scale)
}
