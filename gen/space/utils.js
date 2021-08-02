var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as WA from "../../vibrato.js/js/wa.js";
export const modules = {
    mem: WA.module("vibrato.js/rt/mem.wasm"),
    space: WA.module("vibrato.js/rt/space.wasm"),
    scalarField: WA.module("wa/scalarField.wasm"),
};
export function initWaModules() {
    return __awaiter(this, void 0, void 0, function* () {
        return WA.loadWeb("", modules, "mem", "space", "scalarField");
    });
}
//# sourceMappingURL=utils.js.map