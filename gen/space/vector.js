import { failure } from "../djee/utils.js";
class VecMathBase {
    of(...components) {
        return components;
    }
    neg(v) {
        return this.scale(v, -1);
    }
    swizzle(v, ...components) {
        var _a;
        const result = [...components];
        for (let i = 0; i < components.length; i++) {
            result[i] = (_a = v[components[i]]) !== null && _a !== void 0 ? _a : failure("");
        }
        return result;
    }
    dot(v1, v2) {
        let result = 0;
        for (let i = 0; i < v1.length; i++) {
            result += v1[i] * v2[i];
        }
        return result;
    }
    prod(v, m) {
        const result = [...v];
        for (let i = 0; i < v.length; i++) {
            result[i] = this.dot(v, m[i]);
        }
        return result;
    }
    lengthSquared(v) {
        return this.dot(v, v);
    }
    length(v) {
        return Math.sqrt(this.lengthSquared(v));
    }
    unit(v) {
        return this.scale(v, 1 / this.length(v));
    }
    mix(w, v1, v2) {
        return this.add(this.scale(v1, w), this.scale(v2, 1 - w));
    }
    weightedSum(w1, v1, w2, v2) {
        return this.scale(this.add(this.scale(v1, w1), this.scale(v2, w2)), 1 / (w1 + w2));
    }
    angle(v1, v2) {
        const l1 = this.lengthSquared(v1);
        const l2 = this.lengthSquared(v2);
        const dot = this.dot(v1, v2);
        const cos2 = (dot * dot) / (l1 * l2);
        const cos2x = 2 * cos2 - 1;
        const x = Math.acos(cos2x) / 2;
        return x;
    }
}
export class ImmutableVecMathBase extends VecMathBase {
    constructor(mut = new MutableVecMathBase()) {
        super();
        this.mut = mut;
    }
    add(v1, v2) {
        return this.mut.add([...v1], v2);
    }
    sub(v1, v2) {
        return this.mut.sub([...v1], v2);
    }
    mul(v1, v2) {
        return this.mut.mul([...v1], v2);
    }
    div(v1, v2) {
        return this.mut.div([...v1], v2);
    }
    scale(v, f) {
        return this.mut.scale([...v], f);
    }
    max(v1, v2) {
        return this.mut.max([...v1], v2);
    }
    min(v1, v2) {
        return this.mut.min([...v1], v2);
    }
}
export class ImmutableVec4Math extends ImmutableVecMathBase {
    constructor() {
        super(new MutableVecMathBase());
    }
    add(v1, v2) {
        return [
            v1[0] + v2[0],
            v1[1] + v2[1],
            v1[2] + v2[2],
            v1[3] + v2[3]
        ];
    }
    sub(v1, v2) {
        return [
            v1[0] - v2[0],
            v1[1] - v2[1],
            v1[2] - v2[2],
            v1[3] - v2[3]
        ];
    }
    mul(v1, v2) {
        return [
            v1[0] * v2[0],
            v1[1] * v2[1],
            v1[2] * v2[2],
            v1[3] * v2[3]
        ];
    }
    div(v1, v2) {
        return [
            v1[0] / v2[0],
            v1[1] / v2[1],
            v1[2] / v2[2],
            v1[3] / v2[3]
        ];
    }
    scale(v, f) {
        return [
            v[0] * f,
            v[1] * f,
            v[2] * f,
            v[3] * f
        ];
    }
    neg(v) {
        return [
            -v[0],
            -v[1],
            -v[2],
            -v[3]
        ];
    }
    swizzle(v, ...components) {
        var _a, _b, _c, _d;
        return [
            (_a = v[components[0]]) !== null && _a !== void 0 ? _a : failure(""),
            (_b = v[components[1]]) !== null && _b !== void 0 ? _b : failure(""),
            (_c = v[components[2]]) !== null && _c !== void 0 ? _c : failure(""),
            (_d = v[components[3]]) !== null && _d !== void 0 ? _d : failure(""),
        ];
    }
    dot(v1, v2) {
        return (v1[0] * v2[0] +
            v1[1] * v2[1] +
            v1[2] * v2[2] +
            v1[3] * v2[3]);
    }
    prod(v, m) {
        return [
            this.dot(v, m[0]),
            this.dot(v, m[1]),
            this.dot(v, m[2]),
            this.dot(v, m[3])
        ];
    }
}
export class ImmutableVec3Math extends ImmutableVecMathBase {
    constructor() {
        super(new MutableVecMathBase());
    }
    add(v1, v2) {
        return [
            v1[0] + v2[0],
            v1[1] + v2[1],
            v1[2] + v2[2]
        ];
    }
    sub(v1, v2) {
        return [
            v1[0] - v2[0],
            v1[1] - v2[1],
            v1[2] - v2[2]
        ];
    }
    mul(v1, v2) {
        return [
            v1[0] * v2[0],
            v1[1] * v2[1],
            v1[2] * v2[2]
        ];
    }
    div(v1, v2) {
        return [
            v1[0] / v2[0],
            v1[1] / v2[1],
            v1[2] / v2[2]
        ];
    }
    scale(v, f) {
        return [
            v[0] * f,
            v[1] * f,
            v[2] * f
        ];
    }
    neg(v) {
        return [
            -v[0],
            -v[1],
            -v[2]
        ];
    }
    swizzle(v, ...components) {
        var _a, _b, _c;
        return [
            (_a = v[components[0]]) !== null && _a !== void 0 ? _a : failure(""),
            (_b = v[components[1]]) !== null && _b !== void 0 ? _b : failure(""),
            (_c = v[components[2]]) !== null && _c !== void 0 ? _c : failure("")
        ];
    }
    dot(v1, v2) {
        return (v1[0] * v2[0] +
            v1[1] * v2[1] +
            v1[2] * v2[2]);
    }
    cross(v1, v2) {
        return [
            v1[1] * v2[2] - v1[2] * v2[1],
            v1[2] * v2[0] - v1[0] * v2[2],
            v1[0] * v2[1] - v1[1] * v2[0]
        ];
    }
    prod(v, m) {
        return [
            this.dot(v, m[0]),
            this.dot(v, m[1]),
            this.dot(v, m[2])
        ];
    }
    equal(v1, v2, precision = 0.001) {
        const cross = this.length(this.cross(v1, v2));
        const dot = this.dot(v1, v2);
        const tan = cross / dot;
        return tan < precision && tan > -precision;
    }
}
export class ImmutableVec2Math extends ImmutableVecMathBase {
    constructor() {
        super(new MutableVecMathBase());
    }
    add(v1, v2) {
        return [
            v1[0] + v2[0],
            v1[1] + v2[1]
        ];
    }
    sub(v1, v2) {
        return [
            v1[0] - v2[0],
            v1[1] - v2[1]
        ];
    }
    mul(v1, v2) {
        return [
            v1[0] * v2[0],
            v1[1] * v2[1]
        ];
    }
    div(v1, v2) {
        return [
            v1[0] / v2[0],
            v1[1] / v2[1]
        ];
    }
    scale(v, f) {
        return [
            v[0] * f,
            v[1] * f
        ];
    }
    neg(v) {
        return [
            -v[0],
            -v[1]
        ];
    }
    swizzle(v, ...components) {
        var _a, _b;
        return [
            (_a = v[components[0]]) !== null && _a !== void 0 ? _a : failure(""),
            (_b = v[components[1]]) !== null && _b !== void 0 ? _b : failure("")
        ];
    }
    dot(v1, v2) {
        return (v1[0] * v2[0] +
            v1[1] * v2[1]);
    }
    prod(v, m) {
        return [
            this.dot(v, m[0]),
            this.dot(v, m[1])
        ];
    }
    cross(v1, v2) {
        return (v1[0] * v2[1] -
            v1[1] * v2[0]);
    }
    equal(v1, v2, precision = 0.001) {
        const cross = this.cross(v1, v2);
        const dot = this.dot(v1, v2);
        const tan = cross / dot;
        return tan < precision && tan > -precision;
    }
}
export class MutableVecMathBase extends VecMathBase {
    add(v1, v2) {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = v1[i] + v2[i];
        }
        return v1;
    }
    sub(v1, v2) {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = v1[i] - v2[i];
        }
        return v1;
    }
    mul(v1, v2) {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = v1[i] * v2[i];
        }
        return v1;
    }
    div(v1, v2) {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = v1[i] / v2[i];
        }
        return v1;
    }
    scale(v, f) {
        for (let i = 0; i < v.length; i++) {
            v[i] = v[i] * f;
        }
        return v;
    }
    max(v1, v2) {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = Math.max(v1[i], v2[i]);
        }
        return v1;
    }
    min(v1, v2) {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = Math.min(v1[i], v2[i]);
        }
        return v1;
    }
}
export class MutableVec4Math extends ImmutableVec4Math {
    add(v1, v2) {
        v1[0] += v2[0];
        v1[1] += v2[1];
        v1[2] += v2[2];
        v1[3] += v2[3];
        return v1;
    }
    sub(v1, v2) {
        v1[0] -= v2[0];
        v1[1] -= v2[1];
        v1[2] -= v2[2];
        v1[3] -= v2[3];
        return v1;
    }
    mul(v1, v2) {
        v1[0] *= v2[0];
        v1[1] *= v2[1];
        v1[2] *= v2[2];
        v1[3] *= v2[3];
        return v1;
    }
    div(v1, v2) {
        v1[0] /= v2[0];
        v1[1] /= v2[1];
        v1[2] /= v2[2];
        v1[3] /= v2[3];
        return v1;
    }
    scale(v, f) {
        v[0] *= f;
        v[1] *= f;
        v[2] *= f;
        v[3] *= f;
        return v;
    }
    neg(v) {
        v[0] = -v[0];
        v[1] = -v[1];
        v[2] = -v[2];
        v[3] = -v[3];
        return v;
    }
}
export class MutableVec3Math extends ImmutableVec3Math {
    add(v1, v2) {
        v1[0] += v2[0];
        v1[1] += v2[1];
        v1[2] += v2[2];
        return v1;
    }
    sub(v1, v2) {
        v1[0] -= v2[0];
        v1[1] -= v2[1];
        v1[2] -= v2[2];
        return v1;
    }
    mul(v1, v2) {
        v1[0] *= v2[0];
        v1[1] *= v2[1];
        v1[2] *= v2[2];
        return v1;
    }
    div(v1, v2) {
        v1[0] /= v2[0];
        v1[1] /= v2[1];
        v1[2] /= v2[2];
        return v1;
    }
    scale(v, f) {
        v[0] *= f;
        v[1] *= f;
        v[2] *= f;
        return v;
    }
    neg(v) {
        v[0] = -v[0];
        v[1] = -v[1];
        v[2] = -v[2];
        return v;
    }
}
export class MutableVec2Math extends ImmutableVec2Math {
    add(v1, v2) {
        v1[0] += v2[0];
        v1[1] += v2[1];
        return v1;
    }
    sub(v1, v2) {
        v1[0] -= v2[0];
        v1[1] -= v2[1];
        return v1;
    }
    mul(v1, v2) {
        v1[0] *= v2[0];
        v1[1] *= v2[1];
        return v1;
    }
    div(v1, v2) {
        v1[0] /= v2[0];
        v1[1] /= v2[1];
        return v1;
    }
    scale(v, f) {
        v[0] *= f;
        v[1] *= f;
        return v;
    }
    neg(v) {
        v[0] = -v[0];
        v[1] = -v[1];
        return v;
    }
}
export const vec2 = new ImmutableVec2Math();
export const vec3 = new ImmutableVec3Math();
export const vec4 = new ImmutableVec4Math();
export const mutVec2 = new MutableVec2Math();
export const mutVec3 = new MutableVec3Math();
export const mutVec4 = new MutableVec4Math();
export function deleteComponent(tuple, component) {
    const result = new Array(tuple.length - 1);
    for (let i = 0, j = 0; i < component; i++, j++) {
        result[j] = tuple[i];
    }
    for (let i = component + 1, j = component; i < tuple.length; i++, j++) {
        result[j] = tuple[i];
    }
    return result;
}
//# sourceMappingURL=vector.js.map