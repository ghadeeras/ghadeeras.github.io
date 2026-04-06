import * as gear from "gear"
import * as aether from "aether"

export class Brush {

    private cursor = gear.required(document.getElementById("cursor")) as HTMLElement
    private circle = gear.required(this.cursor.getElementsByTagName("circle")[0]) as SVGCircleElement

    private _hue: aether.Vec3 = [0.5, 0.5, 0.5]
    private _intensity: number = 1
    private _alpha: number = 1
    private _size: number = 8
    private _tension: number = 8
    private _position: aether.Vec2 = [0, 0]

    constructor() {
        this.size = this._size
        this.refreshColor()
    }

    get hue(): aether.Vec3 {
        return this._hue
    }

    set hue(hue: aether.Vec3) {
        this._hue = hueOf(hue)
        this.refreshColor()
    }

    get intensity() {
        return this._intensity
    }

    set intensity(intensity: number) {
        this._intensity = Math.min(Math.max(intensity, 0), 1)
        this.refreshColor()
    }

    get color(): aether.Vec4 {
        return [...aether.vec3.scale(this._hue, this._intensity), this._alpha]
    }

    refreshColor() {
        const rgb = this.color.map(v => Math.round(v * 255)).join(", ")
        this.circle.setAttribute("stroke", `rgba(${rgb})`)    
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

function hueOf(color3D: aether.Vec3): aether.Vec3 {
    const max = Math.max(...color3D)
    return max !== 0 ? aether.vec3.scale(color3D, 1 / max) : [0, 0, 0]
}

