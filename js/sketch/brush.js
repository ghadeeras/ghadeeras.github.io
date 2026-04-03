import * as gear from "gear";
export class Brush {
    constructor() {
        this.cursor = gear.required(document.getElementById("cursor"));
        this.circle = gear.required(this.cursor.getElementsByTagName("circle")[0]);
        this._size = 8;
        this._tension = 8;
        this._position = [0, 0];
        this.size = this._size;
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
//# sourceMappingURL=brush.js.map