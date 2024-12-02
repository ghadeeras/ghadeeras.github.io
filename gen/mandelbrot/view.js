import { viewGL } from "./view.gl.js";
import { required, viewGPU } from "./view.gpu.js";
export async function view(canvasId, center, scale) {
    const apiElement = required(document.getElementById("graphics-api"));
    try {
        const view = await viewGPU(canvasId, center, scale);
        apiElement.innerHTML = "WebGPU";
        return view;
    }
    catch (e) {
        console.warn("Falling back to WebGL because of exception!", e);
        apiElement.innerHTML = "WebGL";
        return await viewGL(canvasId, center, scale);
    }
}
//# sourceMappingURL=view.js.map