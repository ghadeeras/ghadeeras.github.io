import { sink, Sink } from "./flow.js";

export function text(elementId: string): Sink<string> {
    const element = document.getElementById(elementId);
    if (element == null) {
        throw new Error(`Element '${elementId}' is not found!`)
    }
    return sink(text => { element.textContent = text });
}

export function writeableValue(elementId: string): Sink<string> {
    const element = document.getElementById(elementId) as HTMLInputElement;
    return sink(text => { element.value = text });
}
