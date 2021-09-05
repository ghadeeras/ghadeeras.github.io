var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { fetchFiles } from "../gear/all.js";
import { ViewGL } from "./view.gl.js";
import { required, ViewGPU } from "./view.gpu.js";
export function view(julia, canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const view = yield viewGPU(julia, canvasId, center, scale);
            console.log("Using WebGPU :-)");
            return view;
        }
        catch (e) {
            console.log("Using WebGL :(");
            return yield viewGL(julia, canvasId, center, scale);
        }
    });
}
export function viewGL(julia, canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield fetchFiles({
            vertexShaderCode: "mandelbrot.vert",
            fragmentShaderCode: "mandelbrot.frag"
        }, "/shaders");
        return new ViewGL(julia, canvasId, shaders.vertexShaderCode, shaders.fragmentShaderCode, center, scale);
    });
}
export function viewGPU(julia, canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield fetchFiles({
            shaderCode: "mandelbrot.wgsl"
        }, "/shaders");
        const gpu = required(navigator.gpu);
        const adapter = required(yield gpu.requestAdapter());
        const device = yield adapter.requestDevice();
        return new ViewGPU(julia, device, adapter, canvasId, shaders.shaderCode, center, scale);
    });
}
//# sourceMappingURL=view.js.map