import * as gear from "gear";
import { strokeAttributesStruct } from "./common.js";
import { Color, toHex } from "./color.js";
export class Brush {
    constructor(device, canvas) {
        this.device = device;
        this.canvas = canvas;
        this.cache = new Map();
        this.cursor = gear.required(document.getElementById("cursor"));
        this.circle = gear.required(this.cursor.getElementsByTagName("circle")[0]);
        this._color = new Color([0, 0, 0, 1], () => this.refreshColor());
        this._thickness = 8;
        this._tension = 8;
        this._closed = 0;
        this._position = [0, 0];
        this.thickness = this._thickness;
    }
    get attributes() {
        return {
            color: this._color.rgba,
            thickness: this._thickness,
            tension: this._tension,
            closed: this._closed,
        };
    }
    get color() {
        return this._color;
    }
    get thickness() {
        return this._thickness;
    }
    set thickness(size) {
        this._thickness = size;
    }
    get tension() {
        return this._tension;
    }
    set tension(tension) {
        this._tension = tension;
    }
    get closed() {
        return this._closed == 1;
    }
    set closed(closed) {
        this._closed = closed ? 1 : 0;
    }
    get position() {
        return this._position;
    }
    set position(pos) {
        this._position = pos;
        const ratio = this.canvas.clientWidth / this.canvas.width;
        const radius = this._thickness * ratio;
        this.circle.setAttribute("r", `${radius}px`);
        this.circle.setAttribute("stroke-width", `${radius}px`);
        this.cursor.style.left = `${this._position[0] * ratio - this.cursor.clientWidth / 2}px`;
        this.cursor.style.top = `${this._position[1] * ratio - this.cursor.clientHeight / 2}px`;
        this.cursor.style.display = "block";
    }
    dataBuffer(strokeAttributes = this.attributes) {
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
    destroyDataBuffer(strokeAttributes = this.attributes) {
        const key = this.toKey(strokeAttributes);
        const entry = this.cache.get(key);
        if (entry !== undefined && --entry[1] === 0) {
            entry[0].destroy();
            this.cache.delete(key);
        }
    }
    toKey(strokeAttributes) {
        return JSON.stringify(this.key(strokeAttributes));
    }
    key(strokeAttributes) {
        return {
            color: toHex(strokeAttributes.color),
            thickness: Math.round(strokeAttributes.thickness).toFixed(0),
            tension: Math.round(strokeAttributes.tension).toFixed(0),
            closed: strokeAttributes.closed
        };
    }
    refreshColor() {
        this.circle.setAttribute("stroke", `#${this.color.hex}`);
    }
}
//# sourceMappingURL=brush.js.map