import * as gear from "gear";
import { strokeAttributesStruct } from "./common.js";
import { Color, toHex } from "../utils/color.js";
export class Brush {
    constructor(device, canvas) {
        this.device = device;
        this.canvas = canvas;
        this.cache = new Map();
        this.borderElement = gear.required(document.getElementById("border"));
        this.container = gear.required(document.getElementsByClassName("canvas-container")[0]);
        this.cursor = gear.required(document.getElementById("cursor"));
        this.circle = gear.required(this.cursor.getElementsByTagName("circle")[0]);
        this.rect = gear.required(this.cursor.getElementsByTagName("rect")[0]);
        this.brushSizeElement = gear.required(document.getElementById("brush-size"));
        this.tensionElement = gear.required(document.getElementById("tension"));
        this._color = new Color([0.125, 0.25, 0.375, 1], () => this.refreshColor());
        this._thickness = 8;
        this._tension = 8;
        this._closed = 0;
        this._lines = false;
        this._visible = true;
        this._position = [0, 0];
        this.thickness = this._thickness;
        this.tension = this._tension;
        this.visible = true;
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
    get lines() {
        return this._lines;
    }
    set lines(lines) {
        this._lines = lines;
        this.refreshColor();
    }
    get visible() {
        return this._visible;
    }
    set visible(visible) {
        this._visible = visible;
        this.cursor.style.display = visible ? "block" : "none";
        this.position = this._position;
    }
    set thickness(size) {
        this._thickness = size;
        const ratio = this.canvas.clientWidth / this.canvas.width;
        const radius = this._thickness * ratio;
        const r = `${radius}px`;
        const d = `${2 * radius}px`;
        const offset = `${64 - radius}px`;
        this.circle.setAttribute("r", r);
        this.circle.setAttribute("stroke-width", r);
        this.rect.setAttribute("x", offset);
        this.rect.setAttribute("y", offset);
        this.rect.setAttribute("width", d);
        this.rect.setAttribute("height", d);
        this.rect.setAttribute("stroke-width", r);
        this.brushSizeElement.textContent = Math.round(size).toString();
    }
    get tension() {
        return this._tension;
    }
    set tension(tension) {
        this._tension = tension;
        this.tensionElement.textContent = Math.round(tension).toString();
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
        this.cursor.style.left = `${this._position[0] * ratio - this.cursor.clientWidth / 2}px`;
        this.cursor.style.top = `${this._position[1] * ratio - this.cursor.clientHeight / 2}px`;
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
        const c = this.color.hex;
        if (this._lines) {
            this.circle.setAttribute("stroke", `#00000000`);
            this.rect.setAttribute("stroke", `#${c}`);
        }
        else {
            this.circle.setAttribute("stroke", `#${c}`);
            this.rect.setAttribute("stroke", `#00000000`);
        }
    }
}
//# sourceMappingURL=brush.js.map