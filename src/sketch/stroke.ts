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
            this.attributesDestructor(this.attributes)
            this._strokeGroup.entries.strokePoints.baseResource().destroy()
            this._strokeGroup = null
        }
    }

    clone() {
        const stroke = new Stroke({ ...this._attributes }, this.attributesDestructor, this.minDistance, this.time)
        for (const point of this.points) {
            stroke.addPoint(point.position)
        }
        if (this.finalized) {
            stroke.finalize()
        }
        return stroke
    }

    break() {
        if (this.finalized) {
            return [this]
        }
        const newStroke = this.clone()
        newStroke.finalize()
        
        this.destroy()
        this._startTime = this._endTime = this.time()
        this._length = 0
        this.points.splice(0, this.points.length - 1)
        this.points[0].linear = [0, 0]

        return [newStroke, this]
    }

    get attributes(): cmn.StrokeAttributes {
        return { ...this._attributes, closed: this.closed ? 1 : 0 }
    }

    get duration() {
        return this._endTime - this._startTime
    }

    get length() {
        return this._length
    }

    get visibleLength() {
        return this.length + (this.closed ? 0.5 * this.thickness : this.thickness)
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

    get closed() {
        // TODO It might be better to set the closes attribute only when finalizing the stroke and make it immutable after that.
        return this.finalized && this.points.length > 1 && this._attributes.closed === 1
    }

    set closed(closed: boolean) {
        this.destroy()
        this._attributes.closed = closed ? 1 : 0
    }

    finalize() {
        this.destroy()
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
            const lastDistance = aether.vec2.distance(lastPoint.position, beforeLastPoint.position)
            const prevPoint = lastDistance < this.minDistance ? beforeLastPoint : lastPoint
            if (prevPoint !== lastPoint) {
                this.points.pop()
                this._length -= lastDistance
            }
            const distance = aether.vec2.distance(position, prevPoint.position)
            this._length += distance
        }
        this.points.push({ position: position, linear: [this.length, this.duration] })
        this.destroy()
    }

    // TODO There might be a way to pass the "factory" function to the constructor.
    strokeGroup(factory: (points: StrokePoint[]) => cmn.StrokeBindGroup): cmn.StrokeBindGroup {
        if (this._strokeGroup == null) {
            this._strokeGroup = factory(this.points)
        }
        return this._strokeGroup
    }

}
