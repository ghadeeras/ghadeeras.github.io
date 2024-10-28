import { aether, gear } from "../libs.js";
import * as dgee from '../djee/index.js'
import * as gpuView from "./view.gpu.js"
import * as gpuWiresView from "./view.wires.gpu.js"
import * as glView from "./view.gl.js"

export interface View {

    loadModel(modelUri: string): Promise<dgee.gltf.graph.Model>

    resize(): void
    
    draw(): void

    xrSwitch(): Promise<dgee.xr.XRSwitch | null>

    projectionMatrix: aether.Mat4

    viewMatrix: aether.Mat4

    modelMatrix: aether.Mat4

    readonly canvas: HTMLCanvasElement

    readonly aspectRatio: number

    readonly focalLength: number

    set modelColor(color: aether.Vec4)

    set lightPosition(p: aether.Vec<3>)

    set lightRadius(r: number)

    set shininess(s: number)

    set fogginess(f: number)

}

export type ViewFactory = () => View;

export async function newViewFactory(canvasId: string, wires: boolean = false): Promise<ViewFactory> {
    const apiElement = gear.required(document.getElementById("graphics-api"))
    try {
        const view = wires ? await gpuWiresView.newViewFactory(canvasId) : await gpuView.newViewFactory(canvasId)
        apiElement.innerHTML = "WebGPU"
        return view
    } catch (e) {
        console.warn("Falling back to WebGL because of exception!", e)
        if (wires) {
            throw "Wire frame rendering is not supported yet in WebGL!";
        }
        apiElement.innerHTML = "WebGL"
        return await glView.newViewFactory(canvasId)
    }
}