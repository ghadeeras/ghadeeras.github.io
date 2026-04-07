import * as aether from "aether"
import * as gear from "gear"

export class Color {

    private _hue: aether.Vec3
    private _intensity: number
    private _alpha: number
    
    constructor(rgba: aether.Vec4, private colorChangeCallback: () => void = () => {}) {
        const rgb: aether.Vec3 = [rgba[0], rgba[1], rgba[2]]
        this._hue = hueOf(rgb)
        this._intensity = Math.max(...rgb)
        this._alpha = rgba[3]
        gear.invokeLater(() => colorChangeCallback())
    }

    get hue(): aether.Vec3 {
        return this._hue
    }

    set hue(hue: aether.Vec3) {
        this._hue = hueOf(hue)
        this.colorChangeCallback()
    }

    get intensity() {
        return this._intensity
    }

    set intensity(intensity: number) {
        this._intensity = Math.min(Math.max(intensity, 0), 1)
        this.colorChangeCallback()
    }

    get rgba(): aether.Vec4 {
        return [...aether.vec3.scale(this._hue, this._intensity), this._alpha]
    }

    set rgba(rgba: aether.Vec4) {
        const rgb: aether.Vec3 = [rgba[0], rgba[1], rgba[2]]
        this._hue = hueOf(rgb)
        this._intensity = Math.max(...rgb)
        this._alpha = rgba[3]
        this.colorChangeCallback()
    }

    get hex(): string {
        return toRGB(this.rgba)
    }

}

export function toRGB(color: [number, number, number, number]) {
    return color.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("")
}

export function hueOf(color3D: aether.Vec3): aether.Vec3 {
    const max = Math.max(...color3D)
    return max !== 0 ? aether.vec3.scale(color3D, 1 / max) : [1, 1, 1]
}

export class Pallette2D {

    private redLine: aether.Vec3
    private greenLine: aether.Vec3
    private blueLine: aether.Vec3

    constructor(
        red: aether.Vec2,
        green: aether.Vec2,
        blue: aether.Vec2
    ) {
        this.redLine = line(green, blue)
        this.greenLine = line(blue, red)
        this.blueLine = line(red, green)

        this.redLine = aether.vec3.scale(this.redLine, 1 / aether.vec3.dot([...red, 1], this.redLine))
        this.greenLine = aether.vec3.scale(this.greenLine, 1 / aether.vec3.dot([...green, 1], this.greenLine))
        this.blueLine = aether.vec3.scale(this.blueLine, 1 / aether.vec3.dot([...blue, 1], this.blueLine))
    }

    toColor(position: aether.Vec2): aether.Vec3 {
        const p = aether.vec3.of(...position, 1)
        return aether.vec3.min(aether.vec3.max(aether.vec3.of(
            aether.vec3.dot(p, this.redLine),
            aether.vec3.dot(p, this.greenLine),
            aether.vec3.dot(p, this.blueLine)
        ), [0, 0, 0]), [1, 1, 1])
    }

    fromColor(color: aether.Vec3): aether.Vec2 {
        const c = aether.vec3.sub(color, this.toColor([0, 0]))
        const r = aether.vec2.scale(aether.vec2.from(this.redLine), c[0])
        const g = aether.vec2.scale(aether.vec2.from(this.greenLine), c[1])
        const b = aether.vec2.scale(aether.vec2.from(this.blueLine), c[2])
        return aether.vec2.addAll(r, g, b)
    }

}

function line(p1: aether.Vec2, p2: aether.Vec2): aether.Vec3 {
    const dir = aether.vec2.unit(aether.vec2.sub(p2, p1))
    const normal = aether.vec2.of(dir[1], -dir[0])
    return aether.vec3.of(...normal, -aether.vec2.dot(normal, p1))
}
