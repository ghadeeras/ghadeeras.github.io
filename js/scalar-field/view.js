import * as gear from "gear";
import * as gpuView from './view.gpu.js';
export async function newView(canvasId) {
    const apiElement = gear.required(document.getElementById("graphics-api"));
    if (new URL(location.href).searchParams.has("webgl")) {
        apiElement.innerHTML = "WebGL";
        return await gpuView.newGLView(canvasId);
    }
    try {
        const view = await gpuView.newView(canvasId);
        apiElement.innerHTML = "WebGPU";
        return view;
    }
    catch (e) {
        console.warn("Falling back to WebGL because of exception!", e);
        apiElement.innerHTML = "WebGL";
        return await gpuView.newGLView(canvasId);
    }
}
//# sourceMappingURL=view.js.map