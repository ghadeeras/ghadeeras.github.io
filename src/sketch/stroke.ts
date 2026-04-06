import * as aether from "aether"
import { StrokeBindGroup } from "./stroke.renderer.js"
import { StrokePoint } from "./stroke.computer.js"

export class Stroke {

    readonly points: StrokePoint[] = []

    private _startTime = this.time()
    private _endTime = this._startTime
    private _length = 0
    private _finalized = false
    private _strokeGroup: StrokeBindGroup | null = null;

    constructor(
        private _color: aether.Vec4,
        private _thickness: number, 
        private _tension: number,
        private minDistance = 4,
        private time: () => number = () => performance.now()
    ) {}

    destroy() {
        if (this._strokeGroup !== null) {
            this._strokeGroup.entries.strokeAttributes.baseResource().destroy()
            this._strokeGroup.entries.strokePoints.baseResource().destroy()
            this._strokeGroup = null
        }
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
        return this._color
    }

    set color(color: aether.Vec4) {
        this._color = color
        this.destroy()
    }

    get thickness() {
        return this._thickness
    }

    set thickness(thickness: number) {
        this._thickness = thickness
        this.destroy()
    } 

    get tension() {
        return this._tension
    }

    set tension(tension: number) {
        this._tension = tension
        this.destroy()
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

    strokeGroup(factory: (points: StrokePoint[]) => StrokeBindGroup): StrokeBindGroup {
        if (this._strokeGroup == null) {
            this._strokeGroup = factory(this.points)
        }
        return this._strokeGroup
    }

}
