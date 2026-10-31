import { viewGPU, viewGL } from "./view.gpu.js";
import { required } from "gear";
export async function view(canvasId, center, scale) {
    const apiElement = required(document.getElementById("graphics-api"));
    if (new URL(location.href).searchParams.has("webgl")) {
        apiElement.innerHTML = "WebGL";
        return await viewGL(canvasId, center, scale);
    }
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