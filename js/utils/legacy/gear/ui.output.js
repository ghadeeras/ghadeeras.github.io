import { Target } from "./value.js";
import * as gear from "gear";
export function text(elementId) {
    const element = gear.htmlElement(elementId);
    return new Target(value => element.textContent = value);
}
export function writeableValue(elementId) {
    const element = gear.htmlElement(elementId);
    return new Target(value => element.value = value);
}
//# sourceMappingURL=ui.output.js.map