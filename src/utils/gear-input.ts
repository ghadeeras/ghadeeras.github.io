import { gear } from "../libs"
import { error, required } from "./misc"

export type PointerType = "mouse" | "touch" | "pen"

export class Pointer {

    readonly types: Set<string>
    readonly element: HTMLCanvasElement

    private _x = 0
    private _y = 0

    private _primary: PointerButton | null = null
    private _secondary: PointerButton | null = null
    private _auxiliary: PointerButton | null = null

    private onpointerdown: typeof this.element.onpointerdown
    private onpointerup: typeof this.element.onpointerup
    private onpointermove: typeof this.element.onpointermove
    
    constructor(element: HTMLCanvasElement | string, types: PointerType[] = ["mouse", "touch", "pen"], aspectRatio = () => this.aspectRatio()) {
        this.types = new Set(types)
        this.element = asCanvas(element)
        this.onpointerdown = e => this.buttonUsed(e, b => {
            this.element.setPointerCapture(e.pointerId)
            b.pressed = true
        })
        this.onpointerup = e => this.buttonUsed(e, b => {
            this.element.releasePointerCapture(e.pointerId)
            b.pressed = false
        })
        this.onpointermove = e => this.pointerMoved(e, aspectRatio)
    }

    use() {
        this.element.onpointerdown = this.onpointerdown
        this.element.onpointerup = this.onpointerup
        this.element.onpointermove = this.onpointermove
    }

    get x() {
        return this._x
    }

    get y() {
        return this._y
    }

    get position() {
        return [this._x, this._y]
    }

    get primary() {
        return this._primary !== null ? this._primary : (this._primary = new PointerButton("primary"))
    }

    get secondary() {
        return this._secondary !== null ? this._secondary : (this._secondary = new PointerButton("secondary"))
    }

    get auxiliary() {
        return this._auxiliary !== null ? this._auxiliary : (this._auxiliary = new PointerButton("auxiliary"))
    }

    private aspectRatio() {
        return this.element.width / this.element.height
    }

    private pointerMoved(e: PointerEvent, aspectRatio: () => number) {
        if (!this.types.has(e.pointerType)) {
            return
        }
        trap(e)
        const ar = aspectRatio();
        [this._x, this._y] = ar >= 1
            ? [ar * (2 * e.offsetX / this.element.clientWidth - 1), 1 - 2 * e.offsetY / this.element.clientHeight]
            : [2 * e.offsetX / this.element.clientWidth - 1, (1 - 2 * e.offsetY / this.element.clientHeight) / ar]
    }

    private buttonUsed(e: PointerEvent, action: (b: PointerButton) => void) {
        if (!this.types.has(e.pointerType)) {
            return
        }
        const button = this.button(e.button)
        if (button !== null) {
            trap(e)
            action(button)
        }
    }

    private button(buttonId: number): PointerButton | null {
        switch (buttonId) {
            case 0: return this._primary
            case 1: return this._auxiliary
            case 2: return this._secondary
            default: return null
        }
    }

}

export interface KeyboardLikeEvent {

    readonly shiftKey: boolean
    readonly ctrlKey: boolean
    readonly altKey: boolean
    readonly metaKey: boolean

    readonly code: string

    trap(): void

}

class KeyboardEventWrapper implements KeyboardLikeEvent {

    constructor(private e: KeyboardEvent) {}
    
    get repeat(): boolean {
        return this.e.repeat
    }

    get shiftKey(): boolean {
        return this.e.shiftKey
    }
    
    get ctrlKey(): boolean {
        return this.e.ctrlKey
    }
    
    get altKey(): boolean {
        return this.e.altKey
    }
    
    get metaKey(): boolean {
        return this.e.metaKey
    }
    
    get code(): string {
        return this.e.code
    }

    trap(): void {
        trap(this.e)
    }

}

export interface KeyboardEventSource {

    get onkeydown(): gear.Consumer<KeyboardLikeEvent>
    set onkeydown(consumer: gear.Consumer<KeyboardLikeEvent>)

    get onkeyup(): gear.Consumer<KeyboardLikeEvent>
    set onkeyup(consumer: gear.Consumer<KeyboardLikeEvent>)

}

class WindowWrapper implements KeyboardEventSource {

    private _onkeydown: gear.Consumer<KeyboardLikeEvent> = e => {}
    private _onkeyup: gear.Consumer<KeyboardLikeEvent> = e => {}

    get onkeydown(): gear.Consumer<KeyboardLikeEvent> {
        return this._onkeydown
    }

    set onkeydown(consumer: gear.Consumer<KeyboardLikeEvent>) {
        window.onkeydown = e => consumer(new KeyboardEventWrapper(e))
    }

    get onkeyup(): gear.Consumer<KeyboardLikeEvent> {
        return this._onkeyup
    }

    set onkeyup(consumer: gear.Consumer<KeyboardLikeEvent>) {
        window.onkeyup = e => consumer(new KeyboardEventWrapper(e))
    }

}

export class Keyboard {

    private keys = new Map<string, Key>()

    private _shift = false 
    private _ctrl = false 
    private _alt = false 
    private _meta = false

    private onkeydown: gear.Consumer<KeyboardLikeEvent>
    private onkeyup: gear.Consumer<KeyboardLikeEvent>

    constructor(private eventSource: KeyboardEventSource = new WindowWrapper()) {
        this.onkeydown = e => this.keyUsed(e, true)
        this.onkeyup = e => this.keyUsed(e, false)
    }

    use() {
        this.eventSource.onkeydown = this.onkeydown
        this.eventSource.onkeyup = this.onkeyup
    }
    
    get shift() {
        return this._shift
    } 

    get ctrl() {
        return this._ctrl
    } 

    get alt() {
        return this._alt
    } 

    get meta() {
        return this._meta
    } 

    private keyUsed(e: KeyboardLikeEvent, pressed: boolean) {
        this._shift = e.shiftKey
        this._ctrl = e.ctrlKey
        this._alt = e.altKey
        this._meta = e.metaKey
        const key = this.keys.get(e.code)
        if (key !== undefined) {
            e.trap()
            key.pressed = pressed
        }
    }

    key(code: string): Key {
        let key = this.keys.get(code)
        if (key === undefined) {
            key = new Key(code)
            this.keys.set(code, key)
        }
        return key
    }

}

export class Button {

    private _pressed = false

    private observers: gear.Consumer<this>[] = []

    get pressed() {
        return this._pressed
    }

    set pressed(p: boolean) {
        if (this._pressed !== p) {
            this._pressed = p
            this.observers.forEach(w => w(this))
        }
    }

    register(observer: gear.Consumer<this>) {
        this.observers.push(observer)
    }

    bindTo<T, K extends keyof T>(value: T, key: K, formula: (button: this, value: T, key: K) => T[K]) {
        value[key] = value[key] // test setter existence
        this.register(b => value[key] = formula(b, value, key))
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

    static allOf(...buttons: Button[]): Button {
        return new DerivedButton(buttons, (...buttons) => buttons.every(b => b.pressed))
    }

    static anyOf(...buttons: Button[]): Button {
        return new DerivedButton(buttons, (...buttons) => buttons.some(b => b.pressed))
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

class DerivedButton<B extends Button[]> extends Button {

    constructor(buttons: B, formula: (...buttons: B) => boolean) {
        super()
        buttons.forEach(b => b.register(() => this.pressed = formula(...buttons)))
    }
    
} 

function asCanvas(element: string | HTMLElement): HTMLCanvasElement {
    return typeof(element) === 'string' 
        ? asCanvas(required(document.getElementById(element))) 
        : element instanceof HTMLCanvasElement
            ? element
            : error<HTMLCanvasElement>("Element is not a button element!") 
}

function trap(e: UIEvent) {
    e.preventDefault()
    e.stopImmediatePropagation()
    e.stopPropagation()
}
