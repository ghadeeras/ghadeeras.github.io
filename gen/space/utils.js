import { Vector } from "./vector.js";
import { Matrix } from "./matrix.js";
import * as WA from "./wa.js";
export function vec(...coordinates) {
    return new Vector(coordinates);
}
export function mat(...columns) {
    return new Matrix(columns);
}
export const modules = {
    stack: WA.module("stack.wasm", exports => exports),
    space: WA.module("space.wasm", exports => exports),
    scalarField: WA.module("scalarField.wasm", exports => exports),
};
export function initWaModules(onready) {
    WA.load(modules, "stack", "space", "scalarField").then(() => onready());
}
//# sourceMappingURL=utils.js.map