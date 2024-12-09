import { Target } from "./value.js";
import { htmlElement } from "./utils.js";
export function text(elementId) {
    const element = htmlElement(elementId);
    return new Target(value => element.textContent = value);
}
export function writeableValue(elementId) {
    const element = htmlElement(elementId);
    return new Target(value => element.value = value);
}
