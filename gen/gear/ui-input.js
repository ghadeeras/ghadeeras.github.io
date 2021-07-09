import { Flow, Value } from "./flow.js";
import { lazy } from "./lazy.js";
export function pos(x, y) {
    return [x, y];
}
export function checkbox(elementId) {
    const element = document.getElementById(elementId);
    const value = new Value(element.checked);
    element.onchange = () => value.consumer(element.checked);
    return value.flow();
}
export function readableValue(elementId) {
    const element = document.getElementById(elementId);
    const value = new Value(element.value);
    element.onchange = () => value.consumer(element.value);
    return value.flow();
}
export function elementEvents(elementId) {
    return ElementEvents.create(elementId);
}
export class ElementEvents {
    constructor(element) {
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
    get center() {
        return [this.element.clientWidth / 2, this.element.clientHeight / 2];
    }
    newClick() {
        const value = new Value();
        this.element.onclick = e => {
            value.consumer(e);
            e.preventDefault();
        };
        return value.flow();
    }
    newMouseDown() {
        const value = new Value();
        this.element.onmousedown = e => {
            value.consumer(e);
            e.preventDefault();
        };
        return value.flow();
    }
    newMouseUp() {
        const value = new Value();
        this.element.onmouseup = e => {
            value.consumer(e);
            e.preventDefault();
        };
        return value.flow();
    }
    newMouseMove() {
        const value = new Value();
        this.element.onmousemove = e => {
            value.consumer(e);
            e.preventDefault();
        };
        return value.flow();
    }
    newTouchStart() {
        const value = new Value();
        this.element.ontouchstart = e => {
            e.preventDefault();
            value.consumer(e);
        };
        return value.flow();
    }
    newTouchEnd() {
        const value = new Value();
        this.element.ontouchend = this.element.ontouchcancel = e => {
            e.preventDefault();
            value.consumer(e);
        };
        return value.flow();
    }
    newTouchMove() {
        const value = new Value();
        this.element.ontouchmove = e => {
            e.preventDefault();
            value.consumer(e);
        };
        return value.flow();
    }
    newClickPos() {
        return this.click
            .map(e => this.relativePos(e))
            .defaultsTo(this.center);
    }
    newTouchStartPos() {
        return this.touchStart
            .map(e => this.touchesToPositions(e))
            .defaultsTo([]);
    }
    newMousePos() {
        return this.mouseMove
            .map(e => this.relativePos(e))
            .defaultsTo(this.center);
    }
    newTouchPos() {
        return this.touchMove
            .map(e => this.touchesToPositions(e))
            .defaultsTo([]);
    }
    touchesToPositions(e) {
        const touches = new Array(e.touches.length);
        for (let i = 0; i < e.touches.length; i++) {
            const touchItem = e.touches.item(i);
            touches[i] = touchItem != null ? this.relativePos(touchItem) : [-1, -1];
        }
        return touches;
    }
    newDragging() {
        const dragging = {
            startPos: [0, 0],
            pos: [0, 0],
            start: false,
            end: true,
            shift: false,
            ctrl: false,
            alt: false
        };
        return Flow.from(this.touchStart.filter(this.oneTouch()).map(e => this.startDragging(dragging, e, e.touches[0])), this.mouseDown.map(e => this.startDragging(dragging, e, e)), this.touchMove.filter(this.oneTouch()).map(e => this.drag(dragging, e.touches[0])), this.mouseMove.filter(e => (e.buttons & 1) != 0).map(e => this.drag(dragging, e)), this.touchEnd.map(e => this.doEndDragging(dragging, dragging.pos)), Flow.from(this.mouseUp, this.mouseMove.filter(e => (e.buttons & 1) == 0 && !dragging.end)).map(e => this.endDragging(dragging, e))).defaultsTo(Object.assign({}, dragging));
    }
    oneTouch() {
        return e => e.touches.length == 1;
    }
    startDragging(dragging, e, p) {
        dragging.startPos = dragging.pos = this.relativePos(p);
        dragging.start = true;
        dragging.end = false;
        dragging.shift = e.shiftKey;
        dragging.ctrl = e.ctrlKey;
        dragging.alt = e.altKey;
        return Object.assign({}, dragging);
    }
    drag(dragging, p) {
        dragging.pos = this.relativePos(p);
        dragging.start = false;
        dragging.end = false;
        return Object.assign({}, dragging);
    }
    endDragging(dragging, p) {
        return this.doEndDragging(dragging, this.relativePos(p));
    }
    doEndDragging(dragging, pos) {
        dragging.pos = pos;
        dragging.start = false;
        dragging.end = true;
        return Object.assign({}, dragging);
    }
    relativePos(p) {
        const pointerPos = pos(p.pageX, p.pageY);
        return sub(pointerPos, this.elementPos);
    }
    newMouseButtons() {
        const initialValue = [false, false, false];
        return Flow.from(this.mouseDown.map(e => [e.button, true]), this.mouseUp.map(e => [e.button, false])).reduce(([button, down], buttons) => updatedButtons(buttons, button, down), initialValue);
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
    static create(elementId) {
        const element = document.getElementById(elementId);
        if (element == null) {
            throw new Error(`Element '${elementId}' is not found!`);
        }
        return new ElementEvents(element);
    }
}
function pagePos(element) {
    const result = pos(element.offsetLeft, element.offsetTop);
    const parent = element.parentElement;
    return parent ? add(pagePos(parent), result) : result;
}
function add(pos1, pos2) {
    const [x1, y1] = pos1;
    const [x2, y2] = pos2;
    return [x1 + x2, y1 + y2];
}
function sub(pos1, pos2) {
    const [x1, y1] = pos1;
    const [x2, y2] = pos2;
    return [x1 - x2, y1 - y2];
}
function updatedButtons(buttons, button, pressed) {
    let result = buttons;
    result[button % 3] = pressed;
    return result;
}
//# sourceMappingURL=ui-input.js.map