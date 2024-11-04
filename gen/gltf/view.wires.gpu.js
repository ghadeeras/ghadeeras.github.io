var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { gpu } from "../djee/index.js";
import { NormalsRenderer } from "./normals.gpu.js";
import { NormalsFilter } from "./filter.gpu.js";
export class GPUView {
    constructor(normalsRenderer, normalsFilter, gpuCanvas) {
        this.normalsRenderer = normalsRenderer;
        this.normalsFilter = normalsFilter;
        this.gpuCanvas = gpuCanvas;
    }
    loadModel(modelUri) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.normalsRenderer.loadModel(modelUri);
        });
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
export function newViewFactory(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpu.Device.instance();
        const canvas = device.canvas(canvasId, 1);
        const normalsShaderModule = yield device.loadShaderModule("gltf-wires-normals.wgsl");
        const filterShaderModule = yield device.loadShaderModule("gltf-wires-filter.wgsl");
        return () => {
            const normalsRenderer = new NormalsRenderer(normalsShaderModule, canvas.depthTexture());
            const normalsFilter = new NormalsFilter(filterShaderModule, canvas.size, canvas.format, normalsRenderer.uniforms.gpuBuffer);
            return new GPUView(normalsRenderer, normalsFilter, canvas);
        };
    });
}
//# sourceMappingURL=view.wires.gpu.js.map