import * as aether from "aether"
import * as gear from "gear"

export class Color {

    private _hue: aether.Vec3
    private _intensity: number
    private _alpha: number

    private element: HTMLInputElement
    
    constructor(rgba: aether.Vec4, element: string, private colorChangeCallback: () => void = () => {}) {
        const rgb: aether.Vec3 = [rgba[0], rgba[1], rgba[2]]
        this._hue = hueOf(rgb)
        this._intensity = Math.max(...rgb)
        this._alpha = rgba[3]
        this.element = gear.required(document.getElementById(element)) as HTMLInputElement
        this.element.addEventListener("blur", () => this.hex = this.element.value)
        gear.invokeLater(() => this.refresh())
    }

    get hue(): aether.Vec3 {
        return this._hue
    }

    set hue(hue: aether.Vec3) {
        this._hue = hueOf(hue)
        this.refresh()
    }

    get intensity() {
        return this._intensity
    }

    set intensity(intensity: number) {
        this._intensity = Math.min(Math.max(intensity, 0), 1)
        this.refresh()
    }

    get rgba(): aether.Vec4 {
        return [...aether.vec3.scale(this._hue, this._intensity), this._alpha]
    }

    set rgba(rgba: aether.Vec4) {
        const rgb: aether.Vec3 = [rgba[0], rgba[1], rgba[2]]
        this._hue = hueOf(rgb)
        this._intensity = Math.max(...rgb)
        this._alpha = rgba[3]
        this.refresh()
    }

    private refresh() {
        this.element.value = this.hex.toUpperCase()
        this.colorChangeCallback()
    }

    get hex(): string {
        return toHex(this.rgba)
    }

    set hex(hex: string) {
        const rgba = fromHex(hex)
        if (rgba.every(v => v >= 0 && v <= 1)) {
            this.rgba = rgba
        } else {
            this.refresh()
        }
    }

}

export function toHex(color: aether.Vec4): string {
    return color.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("")
}

export function fromHex(hex: string): aether.Vec4 {
    if (hex.length != 8) {
        return [NaN, NaN, NaN, NaN]
    }
    const parse = (start: number) => parseInt(hex.slice(start, start + 2), 16) / 255
    return [parse(0), parse(2), parse(4), parse(6)]
}

export function hueOf(color3D: aether.Vec3): aether.Vec3 {
    const max = Math.max(...color3D)
    return max !== 0 ? aether.vec3.scale(color3D, 1 / max) : [1, 1, 1]
}

export class Pallette2D {

    private bary: aether.Bary

    constructor(
        red: aether.Vec2,
        green: aether.Vec2,
        blue: aether.Vec2
    ) {
        this.bary = new aether.Bary([...red, 0], [...green, 0], [...blue, 0])
    }

    toColor(position: aether.Vec2): aether.Vec3 {
        const color = this.bary.fromCartesian([...position, 0])
        return aether.vec3.min(aether.vec3.max(color, [0, 0, 0]), [1, 1, 1])
    }

    fromColor(color: aether.Vec3): aether.Vec2 {
        const cartesian = this.bary.toCartesian(color)
        return aether.vec2.from(cartesian)
    }

}
