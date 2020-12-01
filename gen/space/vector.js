export class Vector {
    constructor(coordinates) {
        this.coordinates = coordinates;
    }
    combine(v, op) {
        const max = Math.max(this.coordinates.length, v.coordinates.length);
        const result = new Array(max);
        for (let i = 0; i < max; i++) {
            const c = this.coordinates[i] || 0;
            const vc = v.coordinates[i] || 0;
            result[i] = op(c, vc);
        }
        return new Vector(result);
    }
    affect(f) {
        const length = this.coordinates.length;
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = f(this.coordinates[i]);
        }
        return new Vector(result);
    }
    plus(v) {
        return this.combine(v, (c, cv) => c + cv);
    }
    minus(v) {
        return this.combine(v, (c, cv) => c - cv);
    }
    multiply(v) {
        return this.combine(v, (c, cv) => c * cv);
    }
    divide(v) {
        return this.combine(v, (c, cv) => c / cv);
    }
    scale(factor) {
        return this.affect(c => factor * c);
    }
    dot(v) {
        return this.multiply(v).coordinates.reduce((a, b) => a + b, 0);
    }
    mix(v, weight) {
        return this.scale(1 - weight).plus(v.scale(weight));
    }
    get lengthSquared() {
        return this.dot(this);
    }
    get length() {
        return Math.sqrt(this.lengthSquared);
    }
    get unit() {
        return this.scale(1 / this.length);
    }
    angle(v) {
        const l2 = this.lengthSquared;
        const vl2 = v.lengthSquared;
        const dot = this.dot(v);
        const cos2 = (dot * dot) / (l2 * vl2);
        const cos2x = 2 * cos2 - 1;
        const x = Math.acos(cos2x) / 2;
        return x;
    }
    withDims(n) {
        if (this.coordinates.length == n) {
            return this;
        }
        const result = new Array(n);
        for (let i = 0; i < n; i++) {
            result[i] = this.coordinates[i] || 0;
        }
        return new Vector(result);
    }
    swizzle(...indexes) {
        const result = new Array(indexes.length);
        for (let i = 0; i < indexes.length; i++) {
            result[i] = this.coordinates[indexes[i]] || 0;
        }
        return new Vector(result);
    }
    cross(v) {
        const v1 = this.withDims(3).coordinates;
        const v2 = v.withDims(3).coordinates;
        const result = new Array(3);
        result[0] = v1[1] * v2[2] - v1[2] * v2[1];
        result[1] = v1[2] * v2[0] - v1[0] * v2[2];
        result[2] = v1[0] * v2[1] - v1[1] * v2[0];
        return new Vector(result);
    }
    sameAs(v, precision = 0.001) {
        const cross = this.cross(v).length;
        const dot = this.dot(v);
        const tan = cross / dot;
        return tan < precision && tan > -precision;
    }
    prod(matrix) {
        return new Vector(matrix.columns.map(column => this.dot(column)));
    }
    component(i) {
        return new Vector(this.coordinates.map((c, j) => i == j ? c : 0));
    }
}
//# sourceMappingURL=vector.js.map