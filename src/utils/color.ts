import * as aether from "aether"
import { later } from "gear"

export class Color {

    private aspects: ColorAspects

    constructor(rgba: aether.Vec4, private callback: () => void = () => {}) {
        this.aspects = aspectsOf(rgba)
        later(this.callback)()
    }

    get hue(): aether.Vec3 {
        return this.aspects.hue
    }

    set hue(hue: aether.Vec3) {
        this.aspects.hue = hueOf(hue)
        this.callback()
    }

    get shade() {
        return this.aspects.shade
    }

    set shade(shade: number) {
        this.aspects.shade = Math.min(Math.max(shade, 0), 1)
        this.callback()
    }

    get alpha() {
        return this.aspects.alpha
    }

    set alpha(alpha: number) {
        this.aspects.alpha = Math.min(Math.max(alpha, 0), 1)
        this.callback()
    }

    get rgba(): aether.Vec4 {
        return [...aether.vec3.scale(this.hue, this.shade), this.alpha]
    }

    set rgba(rgba: aether.Vec4) {
        this.aspects = aspectsOf(rgba)
        this.callback()
    }

    get hex(): string {
        return toHex(this.rgba)
    }

    set hex(hex: string) {
        const rgba = fromHex(hex, this.rgba)
        if (rgba.every(v => v >= 0 && v <= 1)) {
            this.rgba = rgba
        }
        this.callback()
    }

}

function aspectsOf(rgba: [number, number, number, number]) {
    const rgb = aether.vec3.from(rgba)
    return {
        hue: hueOf(rgb),
        shade: Math.max(...rgb),
        alpha: rgba[3]
    }
}

export function toHex(color: aether.Vec4): string {
    return color
        .map(v => Math.min(Math.max(v, 0), 1))
        .map(v => Math.round(v * 255).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
}

export function fromHex(hex: string, defaultColor: aether.Vec4): aether.Vec4 {
    if (hex.length != 8) {
        return defaultColor
    }
    try {
        const parse = (start: number) => parseInt(hex.slice(start, start + 2), 16) / 255
        return [parse(0), parse(2), parse(4), parse(6)]
    } catch {
        return defaultColor
    }
}

export function hueOf(color3D: aether.Vec3): aether.Vec3 {
    const max = Math.max(...color3D)
    return max !== 0 ? aether.vec3.scale(color3D, 1 / max) : [1, 1, 1]
}

type ColorAspects = {
    hue: aether.Vec3,
    shade: number,
    alpha: number
}