import { gpu } from "../djee/index.js";
import { NormalsRenderer } from "./normals.gpu.js";
import { NormalsFilter } from "./filter.gpu.js";
export class GPUView {
    constructor(normalsRenderer, normalsFilter, gpuCanvas) {
        this.normalsRenderer = normalsRenderer;
        this.normalsFilter = normalsFilter;
        this.gpuCanvas = gpuCanvas;
    }
    async loadModel(modelUri) {
        return this.normalsRenderer.loadModel(modelUri);
    }
    get canvas() {
        return this.gpuCanvas.element;
    }
    get aspectRatio() {
        return this.normalsRenderer.aspectRatio;
    }
    get focalLength() {
        return this.normalsRenderer.focalLength;
    }
    set modelColor(color) {
    }
    set lightPosition(p) {
    }
    set lightRadius(r) {
    }
    set shininess(s) {
    }
    set fogginess(f) {
    }
    get projectionMatrix() {
        return this.normalsRenderer.projectionMatrix;
    }
    set projectionMatrix(m) {
        this.normalsRenderer.projectionMatrix = m;
    }
    get viewMatrix() {
        return this.normalsRenderer.viewMatrix;
    }
    set viewMatrix(m) {
        this.normalsRenderer.viewMatrix = m;
    }
    get modelMatrix() {
        return this.normalsRenderer.modelMatrix;
    }
    set modelMatrix(m) {
        this.normalsRenderer.modelMatrix = m;
    }
    resize() {
        const width = this.gpuCanvas.element.width;
        const height = this.gpuCanvas.element.height;
        this.gpuCanvas.resize();
        this.normalsRenderer.resize(width, height);
        this.normalsFilter.resize(width, height);
    }
    draw() {
        this.gpuCanvas.device.enqueueCommand("Draw", encoder => {
            this.normalsRenderer.render(encoder, this.normalsFilter.attachment());
            this.normalsFilter.render(encoder, this.gpuCanvas.attachment({ r: 0, g: 0, b: 0, a: 0 }));
        });
    }
    get xrContext() {
        return null;
    }
}
export async function newViewFactory(canvasId) {
    const device = await gpu.Device.instance();
    const canvas = device.canvas(canvasId, 1);
    const normalsShaderModule = await device.loadShaderModule("gltf-wires-normals.wgsl");
    const filterShaderModule = await device.loadShaderModule("gltf-wires-filter.wgsl");
    return () => {
        const normalsRenderer = new NormalsRenderer(normalsShaderModule, canvas.depthTexture());
        const normalsFilter = new NormalsFilter(filterShaderModule, canvas.size, canvas.format, normalsRenderer.uniforms.gpuBuffer);
        return new GPUView(normalsRenderer, normalsFilter, canvas);
    };
}
//# sourceMappingURL=view.wires.gpu.js.map