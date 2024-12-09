import { ButtonInterface, PointerButton } from './button.js';
import { PointerPosition } from "../ui.input.js";
import { Consumer, Property } from "../types.js";
export interface PointerInterface {
    readonly primary: ButtonInterface;
    readonly secondary: ButtonInterface;
    readonly auxiliary: ButtonInterface;
    readonly x: number;
    readonly y: number;
    readonly position: PointerPosition;
    draggingTarget: DraggingTarget | null;
}
export declare class Pointer implements PointerInterface {
    readonly element: HTMLElement;
    private _x;
    private _y;
    readonly primary: PointerButton;
    readonly secondary: PointerButton;
    readonly auxiliary: PointerButton;
    private onpointerdown;
    private onpointerup;
    private onpointermove;
    private _draggingTarget;
    private observers;
    constructor(element: HTMLElement | string);
    register(observer: Consumer<this>): void;
    get draggingTarget(): DraggingTarget | null;
    set draggingTarget(draggingTarget: DraggingTarget | null);
    removeDraggingTarget(): void;
    use(): void;
    get x(): number;
    get y(): number;
    get position(): PointerPosition;
    private pointerMoved;
    private buttonPressed;
    private buttonReleased;
    private buttonUsed;
    private button;
    private updatePositionFrom;
}
export interface DraggingTarget {
    startDragging(pointer: Pointer): void;
    keepDragging(pointer: Pointer): void;
    stopDragging(): void;
}
export declare function draggingTarget<V>(property: Property<V>, dragger: Dragger<V>): DraggingTarget;
export interface Dragger<T> {
    begin(object: T, position: PointerPosition): DraggingFunction<T>;
    end(object: T): T;
}
export type DraggingFunction<T> = (position: PointerPosition) => T;
