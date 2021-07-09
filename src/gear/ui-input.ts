import { Flow, Value } from "./flow.js";
import { lazy } from "./lazy.js";
import { Mapper, Supplier } from "./utils.js";

export type PointerPosition = [number, number];
export type MouseButtons = [boolean, boolean, boolean];

export type Dragging = {
    startPos: PointerPosition
    pos: PointerPosition
    start: boolean
    end: boolean
    shift: boolean
    ctrl: boolean
    alt: boolean
}

export function pos(x: number, y: number): PointerPosition {
    return [x, y]
}

export function checkbox(elementId: string): Flow<boolean> {
    const element = document.getElementById(elementId) as HTMLInputElement;
    const value = new Value<boolean>(element.checked);
    element.onchange = () => value.consumer(element.checked);
    return value.flow();
}

export function readableValue(elementId: string): Flow<string> {
    const element = document.getElementById(elementId) as HTMLInputElement;
    const value = new Value<string>(element.value);
    element.onchange = () => value.consumer(element.value);
    return value.flow();
}

export function elementEvents(elementId: string) {
    return ElementEvents.create(elementId);
}

export class ElementEvents {

    readonly element: HTMLElement;
    readonly elementPos: PointerPosition;

    private readonly lazyClick: Supplier<Flow<MouseEvent>>;
    private readonly lazyMouseDown: Supplier<Flow<MouseEvent>>;
    private readonly lazyMouseUp: Supplier<Flow<MouseEvent>>;
    private readonly lazyMouseMove: Supplier<Flow<MouseEvent>>;
    private readonly lazyTouchStart: Supplier<Flow<TouchEvent>>;
    private readonly lazyTouchEnd: Supplier<Flow<TouchEvent>>;
    private readonly lazyTouchMove: Supplier<Flow<TouchEvent>>;

    private readonly lazyClickPos: Supplier<Flow<PointerPosition>>;
    private readonly lazyTouchStartPos: Supplier<Flow<PointerPosition[]>>;
    private readonly lazyMousePos: Supplier<Flow<PointerPosition>>;
    private readonly lazyTouchPos: Supplier<Flow<PointerPosition[]>>;
    private readonly lazyDragging: Supplier<Flow<Dragging>>;
    private readonly lazyMouseButtons: Supplier<Flow<MouseButtons>>;

    constructor(element: HTMLElement) {
        this.element = element;
        this.elementPos = pagePos(this.element);

        this.lazyClick = lazy(() => this.newClick());
        this.lazyMouseDown = lazy(() => this.newMouseDown());
        this.lazyMouseUp = lazy(() => this.newMouseUp());
        this.lazyMouseMove = lazy(() => this.newMouseMove());
        this.lazyTouchStart = lazy(() => this.newTouchStart());
        this.lazyTouchEnd = lazy(() => this.newTouchEnd());
        this.lazyTouchMove = lazy(() => this.newTouchMove());

        this.lazyClickPos = lazy(() => this.newClickPos());
        this.lazyTouchStartPos = lazy(() => this.newTouchStartPos());
        this.lazyMousePos = lazy(() => this.newMousePos());
        this.lazyTouchPos = lazy(() => this.newTouchPos());
        this.lazyDragging = lazy(() => this.newDragging());
        this.lazyMouseButtons = lazy(() => this.newMouseButtons());
    }

    parent() {
        return this.element.parentElement != null ? new ElementEvents(this.element.parentElement) : null;
    }

    get center(): PointerPosition {
        return [this.element.clientWidth / 2, this.element.clientHeight / 2];
    }

    private newClick(): Flow<MouseEvent> {
        const value = new Value<MouseEvent>();
        this.element.onclick = e => {
            value.consumer(e);
            e.preventDefault();
        }
        return value.flow();
    }

    private newMouseDown(): Flow<MouseEvent> {
        const value = new Value<MouseEvent>();
        this.element.onmousedown = e => {
            value.consumer(e);
            e.preventDefault();
        }
        return value.flow();
    }

    private newMouseUp(): Flow<MouseEvent> {
        const value = new Value<MouseEvent>();
        this.element.onmouseup = e => {
            value.consumer(e);
            e.preventDefault();
        }
        return value.flow();
    }

    private newMouseMove(): Flow<MouseEvent> {
        const value = new Value<MouseEvent>();
        this.element.onmousemove = e => {
            value.consumer(e);
            e.preventDefault();
        }
        return value.flow();
    }

    private newTouchStart(): Flow<TouchEvent> {
        const value = new Value<TouchEvent>();
        this.element.ontouchstart = e => {
            e.preventDefault();
            value.consumer(e);
        }
        return value.flow();
    }

    private newTouchEnd(): Flow<TouchEvent> {
        const value = new Value<TouchEvent>();
        this.element.ontouchend = this.element.ontouchcancel = e => {
            e.preventDefault();
            value.consumer(e);
        }
        return value.flow();
    }

    private newTouchMove(): Flow<TouchEvent> {
        const value = new Value<TouchEvent>();
        this.element.ontouchmove = e => {
            e.preventDefault();
            value.consumer(e);
        }
        return value.flow();
    }

    private newClickPos(): Flow<PointerPosition> {
        return this.click
            .map(e => this.relativePos(e))
            .defaultsTo(this.center)
    }

    private newTouchStartPos(): Flow<PointerPosition[]> {
        return this.touchStart
            .map(e => this.touchesToPositions(e))
            .defaultsTo([])
    }

    private newMousePos(): Flow<PointerPosition> {
        return this.mouseMove
            .map(e => this.relativePos(e))
            .defaultsTo(this.center)
    }

    private newTouchPos(): Flow<PointerPosition[]> {
        return this.touchMove
            .map(e => this.touchesToPositions(e))
            .defaultsTo([]);
    }

    private touchesToPositions(e: TouchEvent) {
        const touches: PointerPosition[] = new Array<PointerPosition>(e.touches.length);
        for (let i = 0; i < e.touches.length; i++) {
            const touchItem = e.touches.item(i);
            touches[i] = touchItem != null ? this.relativePos(touchItem) : [-1, -1];
        }
        return touches;
    }

    private newDragging(): Flow<Dragging> {
        const dragging: Dragging = {
            startPos: [0, 0],
            pos: [0, 0],
            start: false,
            end: true,
            shift: false,
            ctrl: false,
            alt: false
        }
        return Flow.from(
            this.touchStart.filter(this.oneTouch()).map(e => this.startDragging(dragging, e, e.touches[0])),
            this.mouseDown.map(e => this.startDragging(dragging, e, e)),
            this.touchMove.filter(this.oneTouch()).map(e => this.drag(dragging, e.touches[0])),
            this.mouseMove.filter(e => (e.buttons & 1) != 0).map(e => this.drag(dragging, e)),
            this.touchEnd.map(e => this.doEndDragging(dragging, dragging.pos)),
            Flow.from(
                this.mouseUp, 
                this.mouseMove.filter(e => (e.buttons & 1) == 0 && !dragging.end)
            ).map(e => this.endDragging(dragging, e))
        ).defaultsTo({ ...dragging })
    }

    private oneTouch(): Mapper<TouchEvent, boolean> {
        return e => e.touches.length == 1;
    }

    private startDragging(dragging: Dragging, e: MouseEvent | TouchEvent, p: Pointer) {
        dragging.startPos = dragging.pos = this.relativePos(p);
        dragging.start = true;
        dragging.end = false;
        dragging.shift = e.shiftKey;
        dragging.ctrl = e.ctrlKey;
        dragging.alt = e.altKey;
        return { ...dragging };
    }

    private drag(dragging: Dragging, p: Pointer) {
        dragging.pos = this.relativePos(p);
        dragging.start = false;
        dragging.end = false;
        return { ...dragging };
    }

    private endDragging(dragging: Dragging, p: Pointer) {
        return this.doEndDragging(dragging, this.relativePos(p));
    }

    private doEndDragging(dragging: Dragging, pos: PointerPosition) {
        dragging.pos = pos;
        dragging.start = false;
        dragging.end = true;
        return { ...dragging };
    }

    private relativePos(p: Pointer) {
        const pointerPos = pos(p.pageX, p.pageY);
        return sub(pointerPos, this.elementPos);
    }

    private newMouseButtons(): Flow<MouseButtons> {
        const initialValue: MouseButtons = [false, false, false];
        type MouseButtonsUpdate = [number, boolean]
        return Flow.from<MouseButtonsUpdate>(
            this.mouseDown.map(e => [e.button, true]), 
            this.mouseUp.map(e => [e.button, false])
        ).reduce(([button, down], buttons) => updatedButtons(buttons, button, down), initialValue)
    }

    get click() {
        return this.lazyClick();
    }

    get mouseDown() {
        return this.lazyMouseDown();
    }

    get mouseUp() {
        return this.lazyMouseUp();
    }

    get mouseMove() {
        return this.lazyMouseMove();
    }

    get touchStart() {
        return this.lazyTouchStart();
    }

    get touchEnd() {
        return this.lazyTouchEnd();
    }

    get touchMove() {
        return this.lazyTouchMove();
    }

    get clickPos() {
        return this.lazyClickPos();
    }

    get touchStartPos() {
        return this.lazyTouchStartPos();
    }

    get mousePos() {
        return this.lazyMousePos();
    }

    get touchPos() {
        return this.lazyTouchPos();
    }

    get dragging() {
        return this.lazyDragging();
    }

    get mouseButtons() {
        return this.lazyMouseButtons();
    }

    static create(elementId: string) {
        const element = document.getElementById(elementId);
        if (element == null) {
            throw new Error(`Element '${elementId}' is not found!`)
        }
        return new ElementEvents(element);
    }

}

interface Pointer {
    pageX: number;
    pageY: number;
}

function pagePos(element: HTMLElement): PointerPosition {
    const result = pos(element.offsetLeft, element.offsetTop);
    const parent = element.parentElement;
    return parent ? add(pagePos(parent), result) : result;
}

function add(pos1: PointerPosition, pos2: PointerPosition): PointerPosition {
    const [x1, y1] = pos1;
    const [x2, y2] = pos2;
    return [x1 + x2, y1 + y2]
}

function sub(pos1: PointerPosition, pos2: PointerPosition): PointerPosition {
    const [x1, y1] = pos1;
    const [x2, y2] = pos2;
    return [x1 - x2, y1 - y2]
}

function updatedButtons(buttons: MouseButtons, button: number, pressed: boolean): MouseButtons {
    let result = buttons;
    result[button % 3] = pressed;
    return result;
}
