import { required } from "./gear-misc.js";
import { PointerButton } from './gear-buttons.js';
import { trap } from './gear.js';
export class Pointer {
    constructor(element) {
        this._x = 0;
        this._y = 0;
        this.primary = new PointerButton("primary");
        this.secondary = new PointerButton("secondary");
        this.auxiliary = new PointerButton("auxiliary");
        this.onpointerdown = e => this.buttonUsed(e, b => this.buttonPressed(e, b));
        this.onpointerup = e => this.buttonUsed(e, b => this.buttonReleased(e, b));
        this.onpointermove = e => this.pointerMoved(e);
        this._draggingTarget = null;
        this.observers = [];
        this.element = element instanceof HTMLElement ? element : required(document.getElementById(element));
        this.primary.register(b => {
            if (this._draggingTarget !== null) {
                b.pressed
                    ? this._draggingTarget.startDragging(this)
                    : this._draggingTarget.stopDragging();
            }
        });
        this.register(() => {
            if (this._draggingTarget !== null) {
                this._draggingTarget.keepDragging(this);
            }
        });
    }
    register(observer) {
        this.observers.push(observer);
    }
    get draggingTarget() {
        return this._draggingTarget;
    }
    set draggingTarget(draggingTarget) {
        this.removeDraggingTarget();
        this._draggingTarget = draggingTarget;
    }
    removeDraggingTarget() {
        if (this._draggingTarget !== null) {
            this._draggingTarget.stopDragging();
            this._draggingTarget = null;
        }
    }
    use() {
        this.element.onpointerdown = this.onpointerdown;
        this.element.onpointerup = this.onpointerup;
        this.element.onpointermove = this.onpointermove;
        this.element.ontouchstart = trap;
        this.element.ontouchend = trap;
        this.element.ontouchmove = trap;
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    get position() {
        return [this._x, this._y];
    }
    pointerMoved(e) {
        trap(e);
        this.updatePositionFrom(e);
        this.observers.forEach(observer => observer(this));
    }
    buttonPressed(e, b) {
        this.element.setPointerCapture(e.pointerId);
        b.pressed = true;
    }
    buttonReleased(e, b) {
        b.pressed = false;
        this.element.releasePointerCapture(e.pointerId);
    }
    buttonUsed(e, action) {
        const button = this.button(e.button);
        if (button !== null) {
            trap(e);
            this.updatePositionFrom(e);
            action(button);
        }
    }
    button(buttonId) {
        switch (buttonId) {
            case 0: return this.primary;
            case 1: return this.auxiliary;
            case 2: return this.secondary;
            default: return null;
        }
    }
    updatePositionFrom(e) {
        [this._x, this._y] = [
            2 * e.offsetX / this.element.clientWidth - 1,
            1 - 2 * e.offsetY / this.element.clientHeight
        ];
    }
}
export function draggingTarget(property, dragger) {
    return new GenericDraggingTarget(property, dragger);
}
class GenericDraggingTarget {
    constructor(property, dragger) {
        this.property = property;
        this.dragger = dragger;
        this.drag = () => { };
        this.done = () => { };
        this.initial = property.getter();
    }
    startDragging(pointer) {
        this.initial = this.property.getter();
        const draggingFunction = this.dragger.begin(this.initial, pointer.position);
        this.drag = (pointer) => this.property.setter(draggingFunction(pointer.position));
        this.done = () => this.property.setter(this.dragger.end(this.property.getter()));
    }
    keepDragging(pointer) {
        this.drag(pointer);
    }
    stopDragging() {
        this.done();
        this.drag = () => { };
        this.done = () => { };
    }
}
//# sourceMappingURL=gear-pointer.js.map