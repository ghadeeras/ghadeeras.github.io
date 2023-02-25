import { gear } from "../libs.js"
import { trap } from "./gear.js"
import { Key } from './gear-buttons.js'

export interface KeyboardEventContext {

    readonly repeat: boolean 
    readonly shift: boolean 
    readonly ctrl: boolean 
    readonly alt: boolean 
    readonly meta: boolean

    readonly pressedCount: number

}

export class Keyboard implements KeyboardEventContext {

    private keys = new Map<string, Key>()

    private _repeat = false 
    private _shift = false 
    private _ctrl = false 
    private _alt = false 
    private _meta = false

    private _pressedCount = 0

    private onkeydown: gear.Consumer<KeyboardEvent>
    private onkeyup: gear.Consumer<KeyboardEvent>

    constructor() {
        this.onkeydown = e => this.keyUsed(e, true)
        this.onkeyup = e => this.keyUsed(e, false)
    }

    use() {
        window.onkeydown = this.onkeydown
        window.onkeyup = this.onkeyup
    }
    
    get repeat() {
        return this._repeat
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

    get pressedCount() {
        return this._pressedCount
    }

    private keyUsed(e: KeyboardEvent, pressed: boolean) {
        this._repeat = e.repeat
        this._shift = e.shiftKey
        this._ctrl = e.ctrlKey
        this._alt = e.altKey
        this._meta = e.metaKey
        const key = this.keys.get(e.code)
        if (key !== undefined) {
            trap(e)
            this.updatePressedCount(e, pressed)
            key.pressed = pressed
        }
    }

    private updatePressedCount(e: KeyboardEvent, pressed: boolean) {
        if (!e.repeat) {
            this._pressedCount = Math.max(this._pressedCount + (pressed ? 1 : -1), 0)
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

