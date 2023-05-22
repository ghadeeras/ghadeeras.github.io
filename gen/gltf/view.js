var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { gear } from "../libs.js";
import * as gpuView from "./view.gpu.js";
import * as gpuWiresView from "./view.wires.gpu.js";
import * as glView from "./view.gl.js";
export function newViewFactory(canvasId, wires = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiElement = gear.required(document.getElementById("graphics-api"));
        try {
            const view = wires ? yield gpuWiresView.newViewFactory(canvasId) : yield gpuView.newViewFactory(canvasId);
            apiElement.innerHTML = "WebGPU";
            return view;
        }
        catch (e) {
            console.warn("Falling back to WebGL because of exception!", e);
            if (wires) {
                throw "Wire frame rendering is not supported yet in WebGL!";
            }
            apiElement.innerHTML = "WebGL";
            return yield glView.newViewFactory(canvasId);
        }
    });
}
//# sourceMappingURL=view.js.map