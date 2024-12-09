import { Source, Value } from "./value.js";
import * as types from "./types.js";
export type PointerPosition = [number, number];
export type MouseButtons = [boolean, boolean, boolean];
export type Dragging = <T>(dragger: Dragger<T>) => T;
export type DraggingPositionMapper<T> = types.Mapper<PointerPosition, T>;
export interface DraggingHandler<T> {
    currentValue(position: PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): T;
    mapper(value: T, from: PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): DraggingPositionMapper<T>;
    finalize(value: T): T;
}
export declare function drag<T>(handler: DraggingHandler<T>): types.Effect<Dragging, T>;
declare class Dragger<T> {
    private handler;
    private mapper;
    constructor(handler: DraggingHandler<T>);
    start(position: PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): T;
    drag(position: PointerPosition): T;
    end(position: PointerPosition): T;
}
export declare function posIn(e: HTMLElement): types.Mapper<MouseEvent, PointerPosition>;
export declare function checkbox(elementId: string): Value<boolean>;
export declare function readableValue(elementId: string): Value<string>;
export declare function elementEvents(elementId: string): ElementEvents;
export declare class ElementEvents {
    readonly element: HTMLElement;
    readonly positionNormalizer: types.Mapper<MouseEvent, PointerPosition>;
    readonly click: Source<MouseEvent>;
    readonly pointerDown: Source<PointerEvent>;
    readonly pointerUp: Source<PointerEvent>;
    readonly pointerMove: Source<PointerEvent>;
    readonly clickPos: Source<PointerPosition>;
    readonly pointerPos: Source<PointerPosition>;
    readonly dragging: Source<Dragging>;
    readonly pointerButtons: Source<MouseButtons>;
    constructor(element: HTMLElement);
    parent(): ElementEvents | null;
    private newClickPos;
    private newPointerPos;
    private newDragging;
    private startDragging;
    private drag;
    private endDragging;
    private newPointerButtons;
    static create(elementId: string): ElementEvents;
}
export {};
