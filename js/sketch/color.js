import * as aether from "aether";
import * as gear from "gear";
export class Color {
    constructor(rgba, element, colorChangeCallback = () => { }) {
        this.colorChangeCallback = colorChangeCallback;
        const rgb = [rgba[0], rgba[1], rgba[2]];
        this._hue = hueOf(rgb);
        this._intensity = Math.max(...rgb);
        this._alpha = rgba[3];
        this.element = gear.required(document.getElementById(element));
        this.element.addEventListener("keypress", e => {
            if (e.code === "Enter" && this.hex === this.element.value.toUpperCase()) {
                this.element.blur();
            }
        });
        this.element.addEventListener("change", e => {
            if (this.element === document.activeElement) {
                this.hex = this.element.value;
                this.element.blur();
            }
            else {
                this.element.value = this.hex;
            }
        });
        gear.invokeLater(() => this.refresh());
    }
    get hue() {
        return this._hue;
    }
    set hue(hue) {
        this._hue = hueOf(hue);
        this.refresh();
    }
    get intensity() {
        return this._intensity;
    }
    set intensity(intensity) {
        this._intensity = Math.min(Math.max(intensity, 0), 1);
        this.refresh();
    }
    get rgba() {
        return [...aether.vec3.scale(this._hue, this._intensity), this._alpha];
    }
    set rgba(rgba) {
        const rgb = [rgba[0], rgba[1], rgba[2]];
        this._hue = hueOf(rgb);
        this._intensity = Math.max(...rgb);
        this._alpha = rgba[3];
        this.refresh();
    }
    refresh() {
        this.element.value = this.hex;
        this.colorChangeCallback();
    }
    get hex() {
        return toHex(this.rgba);
    }
    set hex(hex) {
        const rgba = fromHex(hex);
        if (rgba.every(v => v >= 0 && v <= 1)) {
            this.rgba = rgba;
        }
        else {
            this.refresh();
        }
    }
}
export function toHex(color) {
    return color.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
export function fromHex(hex) {
    if (hex.length != 8) {
        return [NaN, NaN, NaN, NaN];
    }
    const parse = (start) => parseInt(hex.slice(start, start + 2), 16) / 255;
    return [parse(0), parse(2), parse(4), parse(6)];
}
export function hueOf(color3D) {
    const max = Math.max(...color3D);
    return max !== 0 ? aether.vec3.scale(color3D, 1 / max) : [1, 1, 1];
}
export class Pallette2D {
    constructor(red, green, blue) {
        this.bary = new aether.Bary([...red, 0], [...green, 0], [...blue, 0]);
    }
    toColor(position) {
        const color = this.bary.fromCartesian([...position, 0]);
        return aether.vec3.min(aether.vec3.max(color, [0, 0, 0]), [1, 1, 1]);
    }
    fromColor(color) {
        const cartesian = this.bary.toCartesian(color);
        return aether.vec2.from(cartesian);
    }
}
//# sourceMappingURL=color.js.map