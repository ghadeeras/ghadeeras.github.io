import { Target } from "./value.js";
import * as gear from "gear";

export function text(elementId: string): Target<string> {
    const element = gear.htmlElement(elementId);
    return new Target(value => element.textContent = value);
}

export function writeableValue(elementId: string): Target<string> {
    const element = gear.htmlElement(elementId) as HTMLInputElement;
    return new Target(value => element.value = value);
}
