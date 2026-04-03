import * as aether from "aether";
export class Stroke {
    constructor(_thickness, _tension, minDistance = 4, time = () => performance.now()) {
        this._thickness = _thickness;
        this._tension = _tension;
        this.minDistance = minDistance;
        this.time = time;
        this.points = [];
        this._startTime = this.time();
        this._endTime = this._startTime;
        this._length = 0;
        this._finalized = false;
        this._strokeGroup = null;
    }
    destroy() {
        if (this._strokeGroup !== null) {
            this._strokeGroup.entries.strokePoints.baseResource().destroy();
            this._strokeGroup = null;
        }
    }
    get duration() {
        return this._endTime - this._startTime;
    }
    get length() {
        return this._length;
    }
    get finalized() {
        return this._finalized;
    }
    get thickness() {
        return this._thickness;
    }
    set thickness(thickness) {
        this._thickness = thickness;
        this.destroy();
    }
    get tension() {
        return this._tension;
    }
    set tension(tension) {
        this._tension = tension;
        this.destroy();
    }
    finalize() {
        this._finalized = true;
    }
    addPoint(position) {
        if (this._finalized) {
            throw new Error("Cannot add point to a finalized stroke");
        }
        this._endTime = this.time();
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const beforeLastPoint = this.points.length > 1 ? this.points[this.points.length - 2] : lastPoint;
            const lastDistance = aether.vec2.length(aether.vec2.sub(lastPoint.position, beforeLastPoint.position));
            const prevPoint = lastDistance < this.minDistance ? beforeLastPoint : lastPoint;
            if (prevPoint !== lastPoint) {
                this.points.pop();
                this._length -= lastDistance;
            }
            const distance = aether.vec2.length(aether.vec2.sub(position, prevPoint.position));
            this._length += distance;
        }
        this.points.push({ position: position, linear: [this.length, this.duration] });
        this.destroy();
    }
    strokeGroup(factory) {
        if (this._strokeGroup == null) {
            this._strokeGroup = factory(this.points);
        }
        return this._strokeGroup;
    }
}
//# sourceMappingURL=stroke.js.map