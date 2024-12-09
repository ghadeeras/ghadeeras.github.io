import { Consumer, Property } from '../types.js';
export interface ButtonInterface {
    get pressed(): boolean;
}
export declare class Button implements ButtonInterface {
    private _pressed;
    private observers;
    get pressed(): boolean;
    set pressed(p: boolean);
    register(observer: Consumer<Button>): void;
    bindTo<V>(property: Property<V>, formula: (button: Button, value: V) => V): void;
    and(that: Button): Button;
    or(that: Button): Button;
    xor(that: Button): Button;
    not(): Button;
    when(predicate: (b: Button) => boolean): DerivedButton;
    static allOf(...buttons: Button[]): Button;
    static anyOf(...buttons: Button[]): Button;
    static noneOf(...buttons: Button[]): Button;
}
export declare class Key extends Button {
    readonly code: string;
    constructor(code: string);
}
export type PointerButtonId = "primary" | "secondary" | "auxiliary";
export declare class PointerButton extends Button {
    readonly id: PointerButtonId;
    constructor(id: PointerButtonId);
}
export declare class VirtualKey extends Button {
    constructor(element: HTMLElement);
}
declare class DerivedButton extends Button {
    constructor(buttons: Button[], formula: (...buttons: Button[]) => boolean);
}
export {};
