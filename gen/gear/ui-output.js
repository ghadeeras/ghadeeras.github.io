import { sink } from "./flow.js";
export function text(elementId) {
    const element = document.getElementById(elementId);
    return sink(text => { element.textContent = text; });
}
export function writeableValue(elementId) {
    const element = document.getElementById(elementId);
    return sink(text => { element.value = text; });
}
//# sourceMappingURL=ui-output.js.map