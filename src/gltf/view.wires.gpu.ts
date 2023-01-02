import { gear } from "/gen/libs.js";
import { gpu } from "../djee/index.js"
import { View, ViewFactory } from "./view.js";
import { NormalsRenderer } from "./normals.gpu.js";
import { NormalsFilter } from "./filter.gpu.js";

export class GPUView implements View {

    constructor(
        private normalsRenderer: NormalsRenderer,
        private normalsFilter: NormalsFilter,
        private canvas: gpu.Canvas,
    ) {}

    resize(): void {
        const width = this.canvas.element.width
        const height = this.canvas.element.height
        this.canvas.resize()
        this.normalsRenderer.resize(width, height)
        this.normalsFilter.resize(width, height)
    }

    draw() {
        this.canvas.device.enqueueCommand("Draw", encoder => {
            this.normalsRenderer.render(encoder, this.normalsFilter.attachment())
            this.normalsFilter.render(encoder, this.canvas.attachment({r: 0, g: 0, b: 0, a: 0}))    
        })
    }

    readonly status: gear.Value<string> = this.normalsRenderer.status

}

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const device = await gpu.Device.instance()
    const canvas = device.canvas(canvasId, 1)
    const normalsShaderModule = await device.loadShaderModule("gltf-wires-normals.wgsl")
    const filterShaderModule = await device.loadShaderModule("gltf-wires-filter.wgsl")
    return inputs => {
        const normalsRenderer = new NormalsRenderer(normalsShaderModule, canvas.depthTexture(), inputs)
        const normalsFilter = new NormalsFilter(filterShaderModule, canvas.size, canvas.format, normalsRenderer.uniforms.gpuBuffer)
        return new GPUView(normalsRenderer, normalsFilter, canvas)
    }
}