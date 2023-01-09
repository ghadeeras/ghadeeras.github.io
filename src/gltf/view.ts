import { aether, gear } from "../libs.js";
import { required } from "../utils/misc.js";
import * as gpuView from "./view.gpu.js"
import * as gpuWiresView from "./view.wires.gpu.js"
import * as glView from "./view.gl.js"

export interface View {

    resize(): void
    
    draw(): void

    readonly status: gear.Value<string>

    readonly projectionMatrix: aether.Mat4

    readonly viewMatrix: aether.Mat4

    readonly modelMatrix: aether.Mat4

}

export type ViewInputs = {

    matModel: gear.Value<aether.Mat<4>>

    matView: gear.Value<aether.Mat<4>>

    color: gear.Value<aether.Vec<4>>

    shininess: gear.Value<number>

    lightPosition: gear.Value<aether.Vec<3>>

    lightRadius: gear.Value<number>

    fogginess: gear.Value<number>

    modelUri: gear.Value<string>

}

export type ViewFactory = (inputs: ViewInputs) => View;

export async function newViewFactory(canvasId: string, wires: boolean = false): Promise<ViewFactory> {
    const apiElement = required(document.getElementById("graphics-api"))
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