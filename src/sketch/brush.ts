import * as gear from "gear"
import * as aether from "aether"

export class Brush {

    private cursor = gear.required(document.getElementById("cursor")) as HTMLElement
    private circle = gear.required(this.cursor.getElementsByTagName("circle")[0]) as SVGCircleElement

    private _size: number = 8
    private _tension: number = 8
    private _position: aether.Vec2 = [0, 0]

    constructor() {
        this.size = this._size
    }

    get size() {
        return this._size
    }

    set size(size: number) {
        this._size = size
        const radius = this._size / window.devicePixelRatio
        this.circle.setAttribute("r", `${radius}`)
        this.circle.setAttribute("stroke-width", `${radius}`)
    }

    get tension() {
        return this._tension
    }

    set tension(tension: number) {
        this._tension = tension
    }

    get position() {
        return this._position
    }

    set position(pos: aether.Vec2) {
        this._position = pos
        this.cursor.style.left = `${this._position[0] / window.devicePixelRatio - this.cursor.clientWidth / 2}px`
        this.cursor.style.top = `${this._position[1] / window.devicePixelRatio - this.cursor.clientHeight / 2}px`
        this.cursor.style.display = "block"
    }

}

