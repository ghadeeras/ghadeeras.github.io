import * as aether from "aether";
import { later } from "gear";
export class Color {
    constructor(rgba, callback = () => { }) {
        this.callback = callback;
        this.aspects = aspectsOf(rgba);
        later(this.callback)();
    }
    get hue() {
        return this.aspects.hue;
    }
    set hue(hue) {
        this.aspects.hue = hueOf(hue);
        this.callback();
    }
    get shade() {
        return this.aspects.shade;
    }
    set shade(shade) {
        this.aspects.shade = Math.min(Math.max(shade, 0), 1);
        this.callback();
    }
    get alpha() {
        return this.aspects.alpha;
    }
    set alpha(alpha) {
        this.aspects.alpha = Math.min(Math.max(alpha, 0), 1);
        this.callback();
    }
    get rgba() {
        return [...aether.vec3.scale(this.hue, this.shade), this.alpha];
    }
    set rgba(rgba) {
        this.aspects = aspectsOf(rgba);
        this.callback();
    }
    get hex() {
        return toHex(this.rgba);
    }
    set hex(hex) {
        const rgba = fromHex(hex, this.rgba);
        if (rgba.every(v => v >= 0 && v <= 1)) {
            this.rgba = rgba;
        }
        this.callback();
    }
}
function aspectsOf(rgba) {
    const rgb = aether.vec3.from(rgba);
    return {
        hue: hueOf(rgb),
        shade: Math.max(...rgb),
        alpha: rgba[3]
    };
}
export function toHex(color) {
    return color
        .map(v => Math.min(Math.max(v, 0), 1))
        .map(v => Math.round(v * 255).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}
export function fromHex(hex, defaultColor) {
    if (hex.length != 8) {
        return defaultColor;
    }
    try {
        const parse = (start) => parseInt(hex.slice(start, start + 2), 16) / 255;
        return [parse(0), parse(2), parse(4), parse(6)];
    }
    catch {
        return defaultColor;
    }
}
export function hueOf(color3D) {
    const max = Math.max(...color3D);
    return max !== 0 ? aether.vec3.scale(color3D, 1 / max) : [1, 1, 1];
}
//# sourceMappingURL=color.js.map