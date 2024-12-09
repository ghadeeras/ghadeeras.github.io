import { vec3, vec4 } from "./vector.js";
export class QuatMath {
    from(array, offset = 0) {
        return vec4.from(array, offset);
    }
    add(q1, q2) {
        return vec4.add(q1, q2);
    }
    sub(q1, q2) {
        return vec4.sub(q1, q2);
    }
    mul(q1, q2) {
        const [x1, y1, z1, w1] = q1;
        const [x2, y2, z2, w2] = q2;
        return [
            y1 * z2 - y2 * z1 + x1 * w2 + x2 * w1,
            z1 * x2 - z2 * x1 + y1 * w2 + y2 * w1,
            x1 * y2 - x2 * y1 + z1 * w2 + z2 * w1,
            w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2
        ];
    }
    scale(q, s) {
        return vec4.scale(q, s);
    }
    neg(q) {
        return vec4.neg(q);
    }
    conj(q) {
        return [-q[0], -q[1], -q[2], q[3]];
    }
    unit(q) {
        return vec4.unit(q);
    }
    inverse(q) {
        return this.scale(this.conj(q), 1 / this.lengthSquared(q));
    }
    lengthSquared(q) {
        return vec4.lengthSquared(q);
    }
    length(q) {
        return vec4.length(q);
    }
    rotation(angle, axis, isNormalized = false) {
        const a = angle / 2;
        const unitAxis = isNormalized ? axis : vec3.unit(axis);
        return [...vec3.scale(unitAxis, Math.sin(a)), Math.cos(a)];
    }
    transform(q, v, isNormalized = false) {
        const [qx, qy, qz, c] = isNormalized ? q : this.unit(q);
        const sa = [qx, qy, qz];
        const ss = vec3.lengthSquared(sa);
        return vec3.addAll(vec3.scale(v, c * c - ss), vec3.scale(sa, 2 * vec3.dot(sa, v)), vec3.scale(vec3.cross(sa, v), 2 * c));
    }
    toMatrix(q, isNormalized = false) {
        const [x, y, z, w] = isNormalized ? q : this.unit(q);
        const xx = x * x;
        const yy = y * y;
        const zz = z * z;
        const xy = x * y;
        const yz = y * z;
        const zx = z * x;
        const wx = w * x;
        const wy = w * y;
        const wz = w * z;
        return [
            [1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (zx - wy)],
            [2 * (xy - wz), 1 - 2 * (zz + xx), 2 * (yz + wx)],
            [2 * (zx + wy), 2 * (yz - wx), 1 - 2 * (xx + yy)]
        ];
    }
}
export const quat = new QuatMath();
