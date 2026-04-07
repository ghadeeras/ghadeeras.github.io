import * as gear from "gear";
import * as aether from "aether";
import { strokeAttributesStruct } from "./common.js";
export class Brush {
    constructor(device) {
        this.device = device;
        this.cache = new Map();
        this.cursor = gear.required(document.getElementById("cursor"));
        this.circle = gear.required(this.cursor.getElementsByTagName("circle")[0]);
        this._hue = [0.5, 0.5, 0.5];
        this._intensity = 1;
        this._alpha = 1;
        this._thickness = 8;
        this._tension = 8;
        this._position = [0, 0];
        this.thickness = this._thickness;
        this.refreshColor();
    }
    get attributes() {
        return {
            color: this.color,
            thickness: this.thickness,
            tension: this.tension
        };
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
    get rgb() {
        return toRGB(this.color);
    }
    get thickness() {
        return this._thickness;
    }
    set thickness(size) {
        this._thickness = size;
        const radius = this._thickness / window.devicePixelRatio;
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
    dataBuffer(strokeAttributes = { color: this.color, thickness: this.thickness, tension: this.tension }) {
        const key = this.toKey(strokeAttributes);
        let entry = this.cache.get(key);
        if (entry === undefined) {
            entry = [this.device.dataBuffer({
                    usage: ["UNIFORM"],
                    data: strokeAttributesStruct.view([strokeAttributes])
                }), 1];
            this.cache.set(key, entry);
        }
        else {
            entry[1]++;
        }
        return entry[0];
    }
    destroyDataBuffer(strokeAttributes = { color: this.color, thickness: this.thickness, tension: this.tension }) {
        const key = this.toKey(strokeAttributes);
        const entry = this.cache.get(key);
        if (entry !== undefined && --entry[1] === 0) {
            entry[0].destroy();
            this.cache.delete(key);
        }
    }
    toKey(strokeAttributes) {
        return JSON.stringify({
            color: toRGB(strokeAttributes.color),
            thickness: Math.round(strokeAttributes.thickness).toFixed(0),
            tension: Math.round(strokeAttributes.tension).toFixed(0),
        });
    }
    refreshColor() {
        this.circle.setAttribute("stroke", `#${this.rgb}`);
    }
}
function toRGB(color) {
    return color.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}
function hueOf(color3D) {
    const max = Math.max(...color3D);
    return max !== 0 ? aether.vec3.scale(color3D, 1 / max) : [0, 0, 0];
}
//# sourceMappingURL=brush.js.map