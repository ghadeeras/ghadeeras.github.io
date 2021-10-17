var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { viewGL } from "./view.gl.js";
import { required, viewGPU } from "./view.gpu.js";
export function view(julia, canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiElement = required(document.getElementById("graphics-api"));
        try {
            const view = yield viewGPU(julia, canvasId, center, scale);
            apiElement.innerHTML = "WebGPU";
            return view;
        }
        catch (e) {
            apiElement.innerHTML = "WebGL";
            return yield viewGL(julia, canvasId, center, scale);
        }
    });
}
//# sourceMappingURL=view.js.map