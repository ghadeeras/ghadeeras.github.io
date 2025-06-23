import * as ui from "./ui.input.js";

export type DraggingFunction<T> = (position: ui.PointerPosition, shift: boolean, ctrl: boolean, alt: boolean) => T

export class SimpleDraggingHandler<T> implements ui.DraggingHandler<T> {

    constructor(private draggingFunction: DraggingFunction<T>) {
    }

    currentValue(position: ui.PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): T {
        return this.draggingFunction(position, shift, ctrl, alt)
    }

    mapper(value: T, from: ui.PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): ui.DraggingPositionMapper<T> {
        return to => this.draggingFunction(to, shift, ctrl, alt);
    }

    finalize(value: T): T {
        return value;
    }
    
}
