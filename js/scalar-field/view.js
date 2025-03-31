import * as gear from "gear";
import * as glView from './view.gl.js';
import * as gpuView from './view.gpu.js';
export async function newView(canvasId) {
    const apiElement = gear.required(document.getElementById("graphics-api"));
    try {
        const view = await gpuView.newView(canvasId);
        apiElement.innerHTML = "WebGPU";
        return view;
    }
    catch (e) {
        console.warn("Falling back to WebGL because of exception!", e);
        apiElement.innerHTML = "WebGL";
        return await glView.newView(canvasId);
    }
}
//# sourceMappingURL=view.js.map