import { trap } from "./gear.js";
import { Key } from './gear-buttons.js';
export class Keyboard {
    constructor() {
        this.keys = new Map();
        this._repeat = false;
        this._shift = false;
        this._ctrl = false;
        this._alt = false;
        this._meta = false;
        this._pressedCount = 0;
        this.onkeydown = e => this.keyUsed(e, true);
        this.onkeyup = e => this.keyUsed(e, false);
    }
    use() {
        window.onkeydown = this.onkeydown;
        window.onkeyup = this.onkeyup;
    }
    get repeat() {
        return this._repeat;
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
    get pressedCount() {
        return this._pressedCount;
    }
    keyUsed(e, pressed) {
        this._repeat = e.repeat;
        this._shift = e.shiftKey;
        this._ctrl = e.ctrlKey;
        this._alt = e.altKey;
        this._meta = e.metaKey;
        const key = this.keys.get(e.code);
        if (key !== undefined) {
            trap(e);
            this.updatePressedCount(e, pressed, key.pressed);
            key.pressed = pressed;
        }
    }
    updatePressedCount(e, pressed, wasPressed) {
        if (pressed !== wasPressed) {
            this._pressedCount = Math.max(this._pressedCount + (pressed ? 1 : -1), 0);
            console.log(this._pressedCount);
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
//# sourceMappingURL=gear-keyboard.js.map