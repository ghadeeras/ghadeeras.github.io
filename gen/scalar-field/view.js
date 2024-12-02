import { gear } from "/gen/libs.js";
import * as glView from './view.gl.js';
import * as gpuView from './view.gpu.js';
export function wire(view, inputs, primitives = WebGL2RenderingContext.TRIANGLES) {
    inputs.matModel.attach(mat => view.setMatModel(mat, mat));
    inputs.matView.attach(mat => view.matView = mat);
    inputs.focalLength.attach(l => view.focalLength = l);
    inputs.color.attach(c => view.color = c);
    inputs.shininess.attach(s => view.shininess = s);
    inputs.lightPosition.attach(pos => view.lightPosition = pos);
    inputs.lightRadius.attach(r => view.lightRadius = r);
    inputs.fogginess.attach(f => view.fogginess = f);
    inputs.vertices.attach(v => view.setMesh(primitives, v));
}
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