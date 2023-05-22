var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as glView from './view.gl.js';
import * as gpuView from './view.gpu.js';
import { required } from "/gear/latest/loops/misc.js";
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
export function newView(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiElement = required(document.getElementById("graphics-api"));
        try {
            const view = yield gpuView.newView(canvasId);
            apiElement.innerHTML = "WebGPU";
            return view;
        }
        catch (e) {
            console.warn("Falling back to WebGL because of exception!", e);
            apiElement.innerHTML = "WebGL";
            return yield glView.newView(canvasId);
        }
    });
}
//# sourceMappingURL=view.js.map