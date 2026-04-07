import * as gear from "gear"
import * as aether from "aether"
import { gpu } from "lumen"
import { StrokeAttributes, strokeAttributesStruct } from "./common.js"
import { Color, toRGB } from "./color.js"

export class Brush {

    private cache = new Map<string, [gpu.DataBuffer, number]>()

    private cursor = gear.required(document.getElementById("cursor")) as HTMLElement
    private circle = gear.required(this.cursor.getElementsByTagName("circle")[0]) as SVGCircleElement

    private _color: Color = new Color(() => this.refreshColor())

    private _thickness: number = 8
    private _tension: number = 8
    private _position: aether.Vec2 = [0, 0]

    constructor(private device: gpu.Device) {
        this.thickness = this._thickness
    }

    get attributes(): StrokeAttributes {
        return {
            color: this.color.rgba,
            thickness: this.thickness,
            tension: this.tension
        }
    }

    get color(): Color {
        return this._color
    }

    get thickness() {
        return this._thickness
    }

    set thickness(size: number) {
        this._thickness = size
        const radius = this._thickness / window.devicePixelRatio
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

    dataBuffer(strokeAttributes: StrokeAttributes = this.attributes): gpu.DataBuffer {
        const key = this.toKey(strokeAttributes)
        let entry = this.cache.get(key)
        if (entry === undefined) {
            entry = [this.device.dataBuffer({
                usage: ["UNIFORM"],
                data: strokeAttributesStruct.view([strokeAttributes])
            }), 1]
            this.cache.set(key, entry)
        } else {
            entry[1]++
        }
        return entry[0]
    }

    destroyDataBuffer(strokeAttributes: StrokeAttributes = this.attributes) {
        const key = this.toKey(strokeAttributes)
        const entry = this.cache.get(key)
        if (entry !== undefined && --entry[1] === 0) {
            entry[0].destroy()
            this.cache.delete(key)
        }
    }

    private toKey(strokeAttributes: StrokeAttributes): string {
        return JSON.stringify({
            color: toRGB(strokeAttributes.color),
            thickness: Math.round(strokeAttributes.thickness).toFixed(0),
            tension: Math.round(strokeAttributes.tension).toFixed(0),
        })
    }

    private refreshColor() {
        this.circle.setAttribute("stroke", `#${this.color.hex}`)
    }

}

