import * as aether from "aether"
import { gpu } from "lumen"
import { View, ViewFactory } from "./view.js";
import { NormalsRenderer } from "./normals.gpu.js";
import { NormalsFilter } from "./filter.gpu.js";

export class GPUView implements View {

    constructor(
        private normalsRenderer: NormalsRenderer,
        private normalsFilter: NormalsFilter,
        private gpuCanvas: gpu.Canvas,
    ) {}

    async loadModel(modelUri: string) {
        return this.normalsRenderer.loadModel(modelUri)
    }

    get canvas() {
        return this.gpuCanvas.element
    }

    get aspectRatio(): number {
        return this.normalsRenderer.aspectRatio;
    }

    get focalLength() {
        return this.normalsRenderer.focalLength
    }

    set modelColor(color: [number, number, number, number]) {
    }

    set lightPosition(p: [number, number, number]) {
    }

    set lightRadius(r: number) {
    }

    set shininess(s: number) {
    }

    set fogginess(f: number) {
    }

    get projectionMatrix() {
        return this.normalsRenderer.projectionMatrix
    }

    set projectionMatrix(m: aether.Mat4) {
        this.normalsRenderer.projectionMatrix = m
    }

    get viewMatrix() {
        return this.normalsRenderer.viewMatrix
    }

    set viewMatrix(m: aether.Mat4) {
        this.normalsRenderer.viewMatrix = m
    }

    get modelMatrix() {
        return this.normalsRenderer.modelMatrix
    }

    set modelMatrix(m: aether.Mat4) {
        this.normalsRenderer.modelMatrix = m
    }

    resize(): void {
        const width = this.gpuCanvas.element.width
        const height = this.gpuCanvas.element.height
        this.gpuCanvas.resize()
        this.normalsRenderer.resize(width, height)
        this.normalsFilter.resize(width, height)
    }

    draw() {
        this.gpuCanvas.device.enqueueCommand("Draw", encoder => {
            this.normalsRenderer.render(encoder, this.normalsFilter.attachment())
            this.normalsFilter.render(encoder, this.gpuCanvas.attachment({r: 0, g: 0, b: 0, a: 0}))    
        })
    }

    get xrContext(): WebGL2RenderingContext | null {
        return null
    }

}

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const device = await gpu.Device.instance()
    const canvas = device.canvas(canvasId, 1)
    const normalsShaderModule = await device.loadShaderModule("gltf-wires-normals.wgsl")
    const filterShaderModule = await device.loadShaderModule("gltf-wires-filter.wgsl")
    return () => {
        const normalsRenderer = new NormalsRenderer(normalsShaderModule, canvas.depthTexture())
        const normalsFilter = new NormalsFilter(filterShaderModule, canvas.size, canvas.format, normalsRenderer.uniforms.gpuBuffer)
        return new GPUView(normalsRenderer, normalsFilter, canvas)
    }
}