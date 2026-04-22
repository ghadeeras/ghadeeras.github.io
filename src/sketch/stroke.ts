import * as aether from "aether"
import { StrokePoint } from "./stroke.computer.js"
import * as cmn from "./common.js"

export class Stroke {

    readonly points: StrokePoint[] = []

    private _startTime = this.time()
    private _endTime = this._startTime
    private _length = 0
    private _finalized = false
    private _strokeGroup: cmn.StrokeBindGroup | null = null;

    constructor(
        private _attributes: cmn.StrokeAttributes,
        private attributesDestructor: (strokeAttributes: cmn.StrokeAttributes) => void,
        private minDistance = 4,
        private time: () => number = () => performance.now()
    ) {}

    destroy() {
        if (this._strokeGroup !== null) {
            this.attributesDestructor(this._attributes)
            this._strokeGroup.entries.strokePoints.baseResource().destroy()
            this._strokeGroup = null
        }
    }

    get attributes(): cmn.StrokeAttributes {
        return { ...this._attributes }
    }

    get duration() {
        return this._endTime - this._startTime
    }

    get length() {
        return this._length
    }

    get finalized() {
        return this._finalized
    }

    get color() {
        return this._attributes.color
    }

    set color(color: aether.Vec4) {
        this.destroy()
        this._attributes.color = color
    }

    get thickness() {
        return this._attributes.thickness
    }

    set thickness(thickness: number) {
        this.destroy()
        this._attributes.thickness = thickness
    } 

    get tension() {
        return this._attributes.tension
    }

    set tension(tension: number) {
        this.destroy()
        this._attributes.tension = tension
    } 

    finalize() {
        this._finalized = true
    }

    addPoint(position: aether.Vec2) {
        if (this._finalized) {
            throw new Error("Cannot add point to a finalized stroke")
        }
        this._endTime = this.time()
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1]
            const beforeLastPoint = this.points.length > 1 ? this.points[this.points.length - 2] : lastPoint
            const lastDistance = aether.vec2.length(aether.vec2.sub(lastPoint.position, beforeLastPoint.position))
            const prevPoint = lastDistance < this.minDistance ? beforeLastPoint : lastPoint
            if (prevPoint !== lastPoint) {
                this.points.pop()
                this._length -= lastDistance
            }
            const distance = aether.vec2.length(aether.vec2.sub(position, prevPoint.position))
            this._length += distance
        }
        this.points.push({ position: position, linear: [this.length, this.duration] })
        this.destroy()
    }

    strokeGroup(factory: (points: StrokePoint[]) => cmn.StrokeBindGroup): cmn.StrokeBindGroup {
        if (this._strokeGroup == null) {
            this._strokeGroup = factory(this.points)
        }
        return this._strokeGroup
    }

}
