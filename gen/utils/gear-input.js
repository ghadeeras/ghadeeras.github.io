import { error, required } from "./misc";
export class Pointer {
    constructor(element, types = ["mouse", "touch", "pen"], aspectRatio = () => this.aspectRatio()) {
        this._x = 0;
        this._y = 0;
        this._primary = null;
        this._secondary = null;
        this._auxiliary = null;
        this.types = new Set(types);
        this.element = asCanvas(element);
        this.onpointerdown = e => this.buttonUsed(e, b => {
            this.element.setPointerCapture(e.pointerId);
            b.pressed = true;
        });
        this.onpointerup = e => this.buttonUsed(e, b => {
            this.element.releasePointerCapture(e.pointerId);
            b.pressed = false;
        });
        this.onpointermove = e => this.pointerMoved(e, aspectRatio);
    }
    use() {
        this.element.onpointerdown = this.onpointerdown;
        this.element.onpointerup = this.onpointerup;
        this.element.onpointermove = this.onpointermove;
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
    get primary() {
        return this._primary !== null ? this._primary : (this._primary = new PointerButton("primary"));
    }
    get secondary() {
        return this._secondary !== null ? this._secondary : (this._secondary = new PointerButton("secondary"));
    }
    get auxiliary() {
        return this._auxiliary !== null ? this._auxiliary : (this._auxiliary = new PointerButton("auxiliary"));
    }
    aspectRatio() {
        return this.element.width / this.element.height;
    }
    pointerMoved(e, aspectRatio) {
        if (!this.types.has(e.pointerType)) {
            return;
        }
        trap(e);
        const ar = aspectRatio();
        [this._x, this._y] = ar >= 1
            ? [ar * (2 * e.offsetX / this.element.clientWidth - 1), 1 - 2 * e.offsetY / this.element.clientHeight]
            : [2 * e.offsetX / this.element.clientWidth - 1, (1 - 2 * e.offsetY / this.element.clientHeight) / ar];
    }
    buttonUsed(e, action) {
        if (!this.types.has(e.pointerType)) {
            return;
        }
        const button = this.button(e.button);
        if (button !== null) {
            trap(e);
            action(button);
        }
    }
    button(buttonId) {
        switch (buttonId) {
            case 0: return this._primary;
            case 1: return this._auxiliary;
            case 2: return this._secondary;
            default: return null;
        }
    }
}
class KeyboardEventWrapper {
    constructor(e) {
        this.e = e;
    }
    get repeat() {
        return this.e.repeat;
    }
    get shiftKey() {
        return this.e.shiftKey;
    }
    get ctrlKey() {
        return this.e.ctrlKey;
    }
    get altKey() {
        return this.e.altKey;
    }
    get metaKey() {
        return this.e.metaKey;
    }
    get code() {
        return this.e.code;
    }
    trap() {
        trap(this.e);
    }
}
class WindowWrapper {
    constructor() {
        this._onkeydown = e => { };
        this._onkeyup = e => { };
    }
    get onkeydown() {
        return this._onkeydown;
    }
    set onkeydown(consumer) {
        window.onkeydown = e => consumer(new KeyboardEventWrapper(e));
    }
    get onkeyup() {
        return this._onkeyup;
    }
    set onkeyup(consumer) {
        window.onkeyup = e => consumer(new KeyboardEventWrapper(e));
    }
}
export class Keyboard {
    constructor(eventSource = new WindowWrapper()) {
        this.eventSource = eventSource;
        this.keys = new Map();
        this._shift = false;
        this._ctrl = false;
        this._alt = false;
        this._meta = false;
        this.onkeydown = e => this.keyUsed(e, true);
        this.onkeyup = e => this.keyUsed(e, false);
    }
    use() {
        this.eventSource.onkeydown = this.onkeydown;
        this.eventSource.onkeyup = this.onkeyup;
    }
    get shift() {
        return this._shift;
    }
    get ctrl() {
        return this._ctrl;
    }
    get alt() {
        return this._alt;
    }
    get meta() {
        return this._meta;
    }
    keyUsed(e, pressed) {
        this._shift = e.shiftKey;
        this._ctrl = e.ctrlKey;
        this._alt = e.altKey;
        this._meta = e.metaKey;
        const key = this.keys.get(e.code);
        if (key !== undefined) {
            e.trap();
            key.pressed = pressed;
        }
    }
    key(code) {
        let key = this.keys.get(code);
        if (key === undefined) {
            key = new Key(code);
            this.keys.set(code, key);
        }
        return key;
    }
}
export class Button {
    constructor() {
        this._pressed = false;
        this.observers = [];
    }
    get pressed() {
        return this._pressed;
    }
    set pressed(p) {
        if (this._pressed !== p) {
            this._pressed = p;
            this.observers.forEach(w => w(this));
        }
    }
    register(observer) {
        this.observers.push(observer);
    }
    bindTo(value, key, formula) {
        value[key] = value[key]; // test setter existence
        this.register(b => value[key] = formula(b, value, key));
    }
    and(that) {
        return Button.allOf(this, that);
    }
    or(that) {
        return Button.anyOf(this, that);
    }
    xor(that) {
        return new DerivedButton([this, that], (a, b) => a.pressed !== b.pressed);
    }
    not() {
        return Button.noneOf(this);
    }
    static allOf(...buttons) {
        return new DerivedButton(buttons, (...buttons) => buttons.every(b => b.pressed));
    }
    static anyOf(...buttons) {
        return new DerivedButton(buttons, (...buttons) => buttons.some(b => b.pressed));
    }
    static noneOf(...buttons) {
        return new DerivedButton(buttons, (...buttons) => buttons.every(b => !b.pressed));
    }
}
export class Key extends Button {
    constructor(code) {
        super();
        this.code = code;
    }
}
export class PointerButton extends Button {
    constructor(id) {
        super();
        this.id = id;
    }
}
class DerivedButton extends Button {
    constructor(buttons, formula) {
        super();
        buttons.forEach(b => b.register(() => this.pressed = formula(...buttons)));
    }
}
function asCanvas(element) {
    return typeof (element) === 'string'
        ? asCanvas(required(document.getElementById(element)))
        : element instanceof HTMLCanvasElement
            ? element
            : error("Element is not a button element!");
}
function trap(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
}
//# sourceMappingURL=gear-input.js.map