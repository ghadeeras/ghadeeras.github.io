import { gear } from '../libs.js'
import { Property, trap } from './gear.js'

export interface ButtonInterface {

    get pressed(): boolean

}

export class Button implements ButtonInterface {

    private _pressed = false

    private observers: gear.Consumer<Button>[] = []

    get pressed() {
        return this._pressed
    }

    set pressed(p: boolean) {
        if (this._pressed !== p) {
            this._pressed = p
            this.observers.forEach(observer => observer(this))
        }
    }

    register(observer: gear.Consumer<Button>) {
        this.observers.push(observer)
    }

    bindTo<V>(property: Property<V>, formula: (button: Button, value: V) => V) {
        this.register(b => property.setter(formula(b, property.getter())))
    }

    and(that: Button): Button {
        return Button.allOf(this, that)
    }

    or(that: Button): Button {
        return Button.anyOf(this, that)
    }

    xor(that: Button): Button {
        return new DerivedButton([this, that], (a, b) => a.pressed !== b.pressed)
    }

    not(): Button {
        return Button.noneOf(this)
    }

    when(predicate: (b: Button) => boolean) {
        return new DerivedButton([this], button => predicate(button))
    }

    static allOf(...buttons: Button[]): Button {
        return buttons.length !== 1 ? new DerivedButton(buttons, (...buttons) => buttons.every(b => b.pressed)) : buttons[0]
    }

    static anyOf(...buttons: Button[]): Button {
        return buttons.length !== 1 ? new DerivedButton(buttons, (...buttons) => buttons.some(b => b.pressed)) : buttons[0]
    }

    static noneOf(...buttons: Button[]): Button {
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
            element.setPointerCapture(e.pointerId)
            this.pressed = true
        }
        element.onpointerup = e => {
            trap(e)
            element.releasePointerCapture(e.pointerId)
            this.pressed = false
        }
    }

}

class DerivedButton extends Button {

    constructor(buttons: Button[], formula: (...buttons: Button[]) => boolean) {
        super()
        this.pressed = formula(...buttons)
        buttons.forEach(b => b.register(() => this.pressed = formula(...buttons)))
    }
    
}
