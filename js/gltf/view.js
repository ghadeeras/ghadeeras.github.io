import * as gear from "gear";
import * as gpuView from "./view.gpu.js";
import * as gpuWiresView from "./view.wires.gpu.js";
import * as glView from "./view.gl.js";
export async function newViewFactory(canvasId, wires = false) {
    const apiElement = gear.required(document.getElementById("graphics-api"));
    if (new URL(location.href).searchParams.has("webgl")) {
        return newGLFactory(wires, apiElement, canvasId);
    }
    try {
        const view = wires ? await gpuWiresView.newViewFactory(canvasId) : await gpuView.newViewFactory(canvasId);
        apiElement.innerHTML = "WebGPU";
        return view;
    }
    catch (e) {
        console.warn("Falling back to WebGL because of exception!", e);
        return newGLFactory(wires, apiElement, canvasId);
    }
}
function newGLFactory(wires, apiElement, canvasId) {
    if (wires) {
        throw "Wire frame rendering is not supported yet in WebGL!";
    }
    apiElement.innerHTML = "WebGL";
    return glView.newViewFactory(canvasId);
}
//# sourceMappingURL=view.js.map