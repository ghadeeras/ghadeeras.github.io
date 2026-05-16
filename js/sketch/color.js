import * as aether from "aether";
import * as gear from "gear";
export class Color {
    constructor(rgba, colorChangeCallback = () => { }) {
        this.colorChangeCallback = colorChangeCallback;
        const rgb = [rgba[0], rgba[1], rgba[2]];
        this._hue = hueOf(rgb);
        this._intensity = Math.max(...rgb);
        this._alpha = rgba[3];
        gear.invokeLater(() => colorChangeCallback());
    }
    get hue() {
        return this._hue;
    }
    set hue(hue) {
        this._hue = hueOf(hue);
        this.colorChangeCallback();
    }
    get intensity() {
        return this._intensity;
    }
    set intensity(intensity) {
        this._intensity = Math.min(Math.max(intensity, 0), 1);
        this.colorChangeCallback();
    }
    get rgba() {
        return [...aether.vec3.scale(this._hue, this._intensity), this._alpha];
    }
    set rgba(rgba) {
        const rgb = [rgba[0], rgba[1], rgba[2]];
        this._hue = hueOf(rgb);
        this._intensity = Math.max(...rgb);
        this._alpha = rgba[3];
        this.colorChangeCallback();
    }
    get hex() {
        return toHex(this.rgba);
    }
    set hex(hex) {
        this.rgba = fromHex(hex);
    }
}
export function toHex(color) {
    return color.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}
export function fromHex(hex) {
    if (hex.length != 8) {
        return [0.5, 0.5, 0.5, 1];
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
        return this.bary.fromCartesian([...position, 0]);
    }
    fromColor(color) {
        const cartesian = this.bary.toCartesian(color);
        return aether.vec2.from(cartesian);
    }
}
//# sourceMappingURL=color.js.map