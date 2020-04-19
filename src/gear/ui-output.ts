module Gear {

    export function text(elementId: string): Sink<string> {
        const element = document.getElementById(elementId);
        return sink(text => { element.textContent = text });
    }

    export function writeableValue(elementId: string): Sink<string> {
        const element = document.getElementById(elementId) as HTMLInputElement;
        return sink(text => { element.value = text });
    }

}