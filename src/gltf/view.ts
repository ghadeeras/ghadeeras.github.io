import type { Mat4, Vec4 } from "aether"
import * as gear from "gear"
import * as dgee from '../djee/index.js'
import * as gpuView from "./view.gpu.js"
import * as gpuWiresView from "./view.wires.gpu.js"
import { Device } from "lumen"

export interface View {

    loadModel(modelUri: string): Promise<dgee.gltf.graph.Model>

    resize(): void
    
    draw(scenes?: Scene[]): void

    projectionMatrix: Mat4

    viewMatrix: Mat4

    modelMatrix: Mat4

    readonly canvas: HTMLCanvasElement

    readonly device: Device

    readonly aspectRatio: number

    readonly focalLength: number

    set modelColor(color: Vec4)

    set lightPosition(p: Vec4)

    set roughnessFactor(s: number)

    set metallicFactor(s: number)

}

export type Scene = {
    state?: {
        projectionMatrix: Mat4
        viewMatrix: Mat4
        modelMatrix: Mat4
        lightPosition: Vec4
    }
    viewport?: [number, number, number, number]
    target?: {
        multiSampledTexture: GPUTexture,
        colorTexture: GPUTexture 
        depthTexture: GPUTexture
    }
}

export type ViewFactory = () => View;

export async function newViewFactory(canvasId: string, wires: boolean = false): Promise<ViewFactory> {
    const apiElement = gear.required(document.getElementById("graphics-api"))
    if (new URL(location.href).searchParams.has("webgl")) {
        return newGLFactory(wires, apiElement, canvasId)
    }
    try {
        const view = wires ? await gpuWiresView.newViewFactory(canvasId) : await gpuView.newViewFactory(canvasId)
        apiElement.innerHTML = "WebGPU"
        return view
    } catch (e) {
        console.warn("Falling back to WebGL because of exception!", e)
        return newGLFactory(wires, apiElement, canvasId)
    }
}

async function newGLFactory(wires: boolean, apiElement: HTMLElement, canvasId: string): Promise<ViewFactory> {
    if (wires) {
        throw "Wire frame rendering is not supported yet in WebGL!"
    }
    apiElement.innerHTML = "WebGL"
    return await gpuView.newGLViewFactory(canvasId)
}
