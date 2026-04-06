import * as gear from "gear";
import * as aether from "aether";
export class Brush {
    constructor() {
        this.cursor = gear.required(document.getElementById("cursor"));
        this.circle = gear.required(this.cursor.getElementsByTagName("circle")[0]);
        this._hue = [0.5, 0.5, 0.5];
        this._intensity = 1;
        this._alpha = 1;
        this._size = 8;
        this._tension = 8;
        this._position = [0, 0];
        this.size = this._size;
        this.refreshColor();
    }
    get hue() {
        return this._hue;
    }
    set hue(hue) {
        this._hue = hueOf(hue);
        this.refreshColor();
    }
    get intensity() {
        return this._intensity;
    }
    set intensity(intensity) {
        this._intensity = Math.min(Math.max(intensity, 0), 1);
        this.refreshColor();
    }
    get color() {
        return [...aether.vec3.scale(this._hue, this._intensity), this._alpha];
    }
    refreshColor() {
        const rgb = this.color.map(v => Math.round(v * 255)).join(", ");
        this.circle.setAttribute("stroke", `rgba(${rgb})`);
    }
    get size() {
        return this._size;
    }
    set size(size) {
        this._size = size;
        const radius = this._size / window.devicePixelRatio;
        this.circle.setAttribute("r", `${radius}`);
        this.circle.setAttribute("stroke-width", `${radius}`);
    }
    get tension() {
        return this._tension;
    }
    set tension(tension) {
        this._tension = tension;
    }
    get position() {
        return this._position;
    }
    set position(pos) {
        this._position = pos;
        this.cursor.style.left = `${this._position[0] / window.devicePixelRatio - this.cursor.clientWidth / 2}px`;
        this.cursor.style.top = `${this._position[1] / window.devicePixelRatio - this.cursor.clientHeight / 2}px`;
        this.cursor.style.display = "block";
    }
}
function hueOf(color3D) {
    const max = Math.max(...color3D);
    return max !== 0 ? aether.vec3.scale(color3D, 1 / max) : [0, 0, 0];
}
//# sourceMappingURL=brush.js.map