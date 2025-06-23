import { Source, Value } from "./value.js";
import * as gear from "gear";
import * as effects from "./effects.js";
export function drag(handler) {
    const dragger = new Dragger(handler);
    return effects.mapping(dragging => dragging(dragger));
}
class Dragger {
    constructor(handler) {
        this.handler = handler;
        this.mapper = position => this.handler.currentValue(position, false, false, false);
    }
    start(position, shift, ctrl, alt) {
        const initialValue = this.handler.currentValue(position, shift, ctrl, alt);
        this.mapper = this.handler.mapper(initialValue, position, shift, ctrl, alt);
        return initialValue;
    }
    drag(position) {
        return this.mapper(position);
    }
    end(position) {
        return this.handler.finalize(this.drag(position));
    }
}
export function posIn(e) {
    return p => [
        (2 * p.offsetX - e.clientWidth) / e.clientWidth,
        (e.clientHeight - 2 * p.offsetY) / e.clientHeight
    ];
}
export function checkbox(elementId) {
    const element = gear.htmlElement(elementId);
    return Source.fromEvent(element, "onchange").value.map(() => element.checked);
}
export function readableValue(elementId) {
    const element = gear.htmlElement(elementId);
    return Source.fromEvent(element, "onchange").value.map(() => element.value);
}
export function elementEvents(elementId) {
    return ElementEvents.create(elementId);
}
export class ElementEvents {
    constructor(element) {
        this.element = element;
        this.positionNormalizer = posIn(this.element);
        this.click = Source.fromEvent(this.element, "onclick", trapping);
        this.pointerDown = primary(Source.fromEvent(this.element, "onpointerdown", trapping));
        this.pointerUp = primary(Source.fromEvent(this.element, "onpointerup", trapping));
        this.pointerMove = primary(Source.fromEvent(this.element, "onpointermove", trapping));
        this.clickPos = this.newClickPos();
        this.pointerPos = this.newPointerPos();
        this.dragging = this.newDragging();
        this.pointerButtons = this.newPointerButtons();
        element.ontouchstart = trapping(() => { });
        element.ontouchmove = trapping(() => { });
        element.ontouchend = trapping(() => { });
    }
    parent() {
        return this.element.parentElement != null ? new ElementEvents(this.element.parentElement) : null;
    }
    newClickPos() {
        return this.click.map(value => value
            .map(this.positionNormalizer)
            .defaultsTo([0, 0]));
    }
    newPointerPos() {
        return this.pointerMove.map(value => value
            .map(this.positionNormalizer)
            .defaultsTo([0, 0]));
    }
    newDragging() {
        const isDragging = [false];
        return new Source(() => Value.from(this.pointerDown.value.filter(() => !isDragging[0]).map(e => this.startDragging(isDragging, e)), this.pointerMove.value.filter(e => (e.buttons & 1) != 0 && isDragging[0]).map(e => this.drag(e)), Value.from(this.pointerMove.value.filter(e => (e.buttons & 1) == 0 && isDragging[0]), this.pointerUp.value.filter(() => isDragging[0])).map(e => this.endDragging(isDragging, e))));
    }
    startDragging(isDragging, p) {
        this.element.setPointerCapture(p.pointerId);
        isDragging[0] = true;
        return dragger => dragger.start(this.positionNormalizer(p), p.shiftKey, p.ctrlKey, p.altKey);
    }
    drag(p) {
        return dragger => dragger.drag(this.positionNormalizer(p));
    }
    endDragging(isDragging, p) {
        this.element.releasePointerCapture(p.pointerId);
        isDragging[0] = false;
        return dragger => dragger.end(this.positionNormalizer(p));
    }
    newPointerButtons() {
        const initialValue = [false, false, false];
        return new Source(() => Value.from(this.pointerDown.value, this.pointerUp.value)
            .map(e => [
            (e.buttons & 1) != 0,
            (e.buttons & 4) != 0,
            (e.buttons & 2) != 0
        ]));
    }
    static create(elementId) {
        return new ElementEvents(gear.htmlElement(elementId));
    }
}
function trapping(consumer) {
    return e => {
        gear.trap(e);
        consumer(e);
    };
}
function primary(s) {
    return s.map(value => value.filter(e => e.isPrimary));
}
//# sourceMappingURL=ui.input.js.map