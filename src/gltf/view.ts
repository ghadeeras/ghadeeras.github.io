import { aether, gear } from "../libs.js";
import { required } from "../utils/misc.js";
import * as gpuView from "./view.gpu.js"
import * as glView from "./view.gl.js"

export interface View {

    draw(): void

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

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const apiElement = required(document.getElementById("graphics-api"))
    try {
        const view = await gpuView.newViewFactory(canvasId)
        apiElement.innerHTML = "WebGPU"
        return view
    } catch (e) {
        apiElement.innerHTML = "WebGL"
        return await glView.newViewFactory(canvasId)
    }
}