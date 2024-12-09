import * as ui from "./ui.input.js";
export type DraggingFunction<T> = (position: ui.PointerPosition, shift: boolean, ctrl: boolean, alt: boolean) => T;
export declare class SimpleDraggingHandler<T> implements ui.DraggingHandler<T> {
    private draggingFunction;
    constructor(draggingFunction: DraggingFunction<T>);
    currentValue(position: ui.PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): T;
    mapper(value: T, from: ui.PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): ui.DraggingPositionMapper<T>;
    finalize(value: T): T;
}
