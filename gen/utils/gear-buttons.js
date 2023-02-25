import { trap } from './gear.js';
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
            this.observers.forEach(observer => observer(this));
        }
    }
    register(observer) {
        this.observers.push(observer);
    }
    bindTo(property, formula) {
        this.register(b => property.setter(formula(b, property.getter())));
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
    when(predicate) {
        return new DerivedButton([this], button => predicate(button));
    }
    static allOf(...buttons) {
        return buttons.length !== 1 ? new DerivedButton(buttons, (...buttons) => buttons.every(b => b.pressed)) : buttons[0];
    }
    static anyOf(...buttons) {
        return buttons.length !== 1 ? new DerivedButton(buttons, (...buttons) => buttons.some(b => b.pressed)) : buttons[0];
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
export class VirtualKey extends Button {
    constructor(element) {
        super();
        element.onpointerdown = e => {
            trap(e);
            this.pressed = true;
        };
        element.onpointerup = e => {
            trap(e);
            this.pressed = false;
        };
    }
}
class DerivedButton extends Button {
    constructor(buttons, formula) {
        super();
        buttons.forEach(b => b.register(() => this.pressed = formula(...buttons)));
    }
}
//# sourceMappingURL=gear-buttons.js.map