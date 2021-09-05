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
export function newView(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const view = yield gpuView.newView(canvasId);
            console.log("Using WebGPU :-)");
            return view;
        }
        catch (e) {
            console.log("Using WebGL :(");
            return yield glView.newView(canvasId);
        }
    });
}
export function asVec(array, offset = 0) {
    return [...array.slice(offset, offset + 4)];
}
export function asMat(array, offset = 0) {
    return [
        asVec(array, offset + 0),
        asVec(array, offset + 4),
        asVec(array, offset + 8),
        asVec(array, offset + 12)
    ];
}
export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
//# sourceMappingURL=view.js.map