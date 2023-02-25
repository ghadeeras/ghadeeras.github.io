import { gear } from '../libs.js'
import { Property, trap } from './gear.js'

export class Button {

    private _pressed = false

    private observers: gear.Consumer<this>[] = []

    get pressed() {
        return this._pressed
    }

    set pressed(p: boolean) {
        if (this._pressed !== p) {
            this._pressed = p
            this.observers.forEach(observer => observer(this))
        }
    }

    register(observer: gear.Consumer<this>) {
        this.observers.push(observer)
    }

    bindTo<V>(property: Property<V>, formula: (button: this, value: V) => V) {
        this.register(b => property.setter(formula(b, property.getter())))
    }

    and(that: Button): Button {
        return Button.allOf(this, that)
    }

    or(that: Button): Button {
        return Button.anyOf(this, that)
    }

    xor(that: Button): Button {
        return new DerivedButton<[this, Button]>([this, that], (a, b) => a.pressed !== b.pressed)
    }

    not(): Button {
        return Button.noneOf(this)
    }

    when(predicate: (b: this) => boolean) {
        return new DerivedButton([this], button => predicate(button))
    }

    static allOf<B extends Button>(...buttons: B[]): Button {
        return buttons.length !== 1 ? new DerivedButton(buttons, (...buttons) => buttons.every(b => b.pressed)) : buttons[0]
    }

    static anyOf<B extends Button>(...buttons: B[]): Button {
        return buttons.length !== 1 ? new DerivedButton(buttons, (...buttons) => buttons.some(b => b.pressed)) : buttons[0]
    }

    static noneOf<B extends Button>(...buttons: B[]): Button {
        return new DerivedButton(buttons, (...buttons) => buttons.every(b => !b.pressed))
    }

}

export class Key extends Button {

    constructor(readonly code: string) {
        super()
    }

}

export type PointerButtonId = "primary" | "secondary" | "auxiliary"

export class PointerButton extends Button {

    constructor(readonly id: PointerButtonId) {
        super()
    }

}

export class VirtualKey extends Button {

    constructor(element: HTMLElement) {
        super()
        element.onpointerdown = e => {
            trap(e)
            this.pressed = true
        }
        element.onpointerup = e => {
            trap(e)
            this.pressed = false
        }
    }

}

class DerivedButton<B extends Button[]> extends Button {

    constructor(buttons: B, formula: (...buttons: B) => boolean) {
        super()
        buttons.forEach(b => b.register(() => this.pressed = formula(...buttons)))
    }
    
} 
