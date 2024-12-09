import * as vec from "./vector.js";
export class Mat4Math {
    from(array, offset = 0) {
        return [
            vec.vec4.from(array, offset),
            vec.vec4.from(array, offset + 4),
            vec.vec4.from(array, offset + 8),
            vec.vec4.from(array, offset + 12),
        ];
    }
    gen(...columns) {
        const column = columns[0];
        return columns.length == 1 ?
            () => [column(), column(), column(), column()] :
            () => [columns[0](), columns[1](), columns[2](), columns[3]()];
    }
    identity() {
        return this.diagonal(1, 1, 1, 1);
    }
    diagonal(...d) {
        return [
            [d[0], 0, 0, 0],
            [0, d[1], 0, 0],
            [0, 0, d[2], 0],
            [0, 0, 0, d[3]]
        ];
    }
    outer(v1, v2) {
        return [
            vec.vec4.scale(v1, v2[0]),
            vec.vec4.scale(v1, v2[1]),
            vec.vec4.scale(v1, v2[2]),
            vec.vec4.scale(v1, v2[3])
        ];
    }
    projectionOn(v) {
        return this.scale(this.outer(v, v), 1 / vec.vec4.lengthSquared(v));
    }
    scalingAlong(v, parallel = 1, perpendicular = 1) {
        return this.cast(mat3.scalingAlong(v, parallel, perpendicular));
    }
    scaling(...diagonal) {
        return this.diagonal(...diagonal, 1);
    }
    translation(t) {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [...t, 1]
        ];
    }
    rotationX(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            [1, 0, 0, 0],
            [0, +cos, +sin, 0],
            [0, -sin, +cos, 0],
            [0, 0, 0, 1]
        ];
    }
    rotationY(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            [+cos, 0, -sin, 0],
            [0, 1, 0, 0],
            [+sin, 0, +cos, 0],
            [0, 0, 0, 1]
        ];
    }
    rotationZ(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            [+cos, +sin, 0, 0],
            [-sin, +cos, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }
    rotation(angle, axis) {
        return this.cast(mat3.rotation(angle, axis));
    }
    crossProdRotation(v1, v2, power = 1) {
        return this.cast(mat3.crossProdRotation(v1, v2, power));
    }
    lookTowards(pos, dir = [0, 0, -1], up = [0, 1, 0]) {
        const r = mat3.lookTowards(dir, up);
        const p = mat3.apply(r, vec.vec3.neg(pos));
        return this.affine(r, p);
    }
    lookAt(pos, objPos = [0, 0, 0], up = [0, 1, 0]) {
        const dir = vec.vec3.sub(objPos, pos);
        return this.lookTowards(pos, dir, up);
    }
    projection(zoom = 1, near = 1, far = 128 * near, aspectRatio = 1) {
        const range = far - near;
        return [
            [zoom / aspectRatio, 0, 0, 0],
            [0, zoom, 0, 0],
            [0, 0, -(near + far) / range, -1],
            [0, 0, -2 * near * far / range, 0]
        ];
    }
    translated(m, t) {
        const newT = vec.vec3.sub(t, mat3.apply(m, t));
        return this.affine(m, newT);
    }
    affine(m, t) {
        return [
            [...m[0], 0],
            [...m[1], 0],
            [...m[2], 0],
            [...t, 1]
        ];
    }
    cast(m) {
        return m.length == 2 ? [
            [...m[0], 0, 0],
            [...m[1], 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ] : [
            [...m[0], 0],
            [...m[1], 0],
            [...m[2], 0],
            [0, 0, 0, 1]
        ];
    }
    apply(m, v) {
        return vec.vec4.addAll(vec.vec4.scale(m[0], v[0]), vec.vec4.scale(m[1], v[1]), vec.vec4.scale(m[2], v[2]), vec.vec4.scale(m[3], v[3]));
    }
    neg(m) {
        return [
            vec.vec4.neg(m[0]),
            vec.vec4.neg(m[1]),
            vec.vec4.neg(m[2]),
            vec.vec4.neg(m[3])
        ];
    }
    scale(m, f) {
        return [
            vec.vec4.scale(m[0], f),
            vec.vec4.scale(m[1], f),
            vec.vec4.scale(m[2], f),
            vec.vec4.scale(m[3], f)
        ];
    }
    add(m1, m2) {
        return [
            vec.vec4.add(m1[0], m2[0]),
            vec.vec4.add(m1[1], m2[1]),
            vec.vec4.add(m1[2], m2[2]),
            vec.vec4.add(m1[3], m2[3])
        ];
    }
    sub(m1, m2) {
        return [
            vec.vec4.sub(m1[0], m2[0]),
            vec.vec4.sub(m1[1], m2[1]),
            vec.vec4.sub(m1[2], m2[2]),
            vec.vec4.sub(m1[3], m2[3])
        ];
    }
    mul(m1, m2) {
        return [
            this.apply(m1, m2[0]),
            this.apply(m1, m2[1]),
            this.apply(m1, m2[2]),
            this.apply(m1, m2[3])
        ];
    }
    determinant(m) {
        const col0 = m[0];
        return (col0[0] * this.minor(m, 0, 0) -
            col0[1] * this.minor(m, 0, 1) +
            col0[2] * this.minor(m, 0, 2) -
            col0[3] * this.minor(m, 0, 3));
    }
    transpose(m) {
        return [
            [m[0][0], m[1][0], m[2][0], m[3][0]],
            [m[0][1], m[1][1], m[2][1], m[3][1]],
            [m[0][2], m[1][2], m[2][2], m[3][2]],
            [m[0][3], m[1][3], m[2][3], m[3][3]]
        ];
    }
    inverse(m) {
        const min00 = this.minor(m, 0, 0);
        const min01 = this.minor(m, 0, 1);
        const min02 = this.minor(m, 0, 2);
        const min03 = this.minor(m, 0, 3);
        const col0 = m[0];
        const det = (col0[0] * min00 -
            col0[1] * min01 +
            col0[2] * min02 -
            col0[3] * min03);
        return this.scale([
            [+min00, -this.minor(m, 1, 0), +this.minor(m, 2, 0), -this.minor(m, 3, 0)],
            [-min01, +this.minor(m, 1, 1), -this.minor(m, 2, 1), +this.minor(m, 3, 1)],
            [+min02, -this.minor(m, 1, 2), +this.minor(m, 2, 2), -this.minor(m, 3, 2)],
            [-min03, +this.minor(m, 1, 3), -this.minor(m, 2, 3), +this.minor(m, 3, 3)]
        ], 1 / det);
    }
    columnMajorArray(m) {
        return [
            ...m[0],
            ...m[1],
            ...m[2],
            ...m[3]
        ];
    }
    minor(m, col, row) {
        return mat3.determinant(this.subMat(m, col, row));
    }
    subMat(m, col, row) {
        const m3x4 = vec.deleteComponent(m, col);
        return [
            vec.deleteComponent(m3x4[0], row),
            vec.deleteComponent(m3x4[1], row),
            vec.deleteComponent(m3x4[2], row)
        ];
    }
}
export class Mat3Math {
    from(array, offset = 0) {
        return [
            vec.vec3.from(array, offset),
            vec.vec3.from(array, offset + 3),
            vec.vec3.from(array, offset + 6),
        ];
    }
    gen(...columns) {
        const column = columns[0];
        return columns.length == 1 ?
            () => [column(), column(), column()] :
            () => [columns[0](), columns[1](), columns[2]()];
    }
    identity() {
        return this.diagonal(1, 1, 1);
    }
    diagonal(...d) {
        return [
            [d[0], 0, 0],
            [0, d[1], 0],
            [0, 0, d[2]]
        ];
    }
    outer(v1, v2) {
        return [
            vec.vec3.scale(v1, v2[0]),
            vec.vec3.scale(v1, v2[1]),
            vec.vec3.scale(v1, v2[2])
        ];
    }
    projectionOn(v) {
        return this.scale(this.outer(v, v), 1 / vec.vec3.lengthSquared(v));
    }
    scalingAlong(v, parallel = 1, perpendicular = 1) {
        if (parallel === perpendicular) {
            return this.diagonal(parallel, parallel, parallel);
        }
        const parallelProj = this.projectionOn(v);
        const perpendicularProj = this.sub(this.identity(), this.projectionOn(v));
        return this.add(parallel === 1 ? parallelProj : this.scale(parallelProj, parallel), perpendicular === 1 ? perpendicularProj : this.scale(perpendicularProj, perpendicular));
    }
    scaling(...diagonal) {
        return this.diagonal(...diagonal);
    }
    rotationX(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            [1, 0, 0],
            [0, +cos, +sin],
            [0, -sin, +cos]
        ];
    }
    rotationY(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            [+cos, 0, -sin],
            [0, 1, 0],
            [+sin, 0, +cos]
        ];
    }
    rotationZ(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            [+cos, +sin, 0],
            [-sin, +cos, 0],
            [0, 0, 1]
        ];
    }
    rotation(angle, axis) {
        const unitAxis = vec.vec3.unit(axis);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return this.rotMat(cos, sin, ...unitAxis);
    }
    crossProdRotation(v1, v2, power = 1) {
        const u1 = vec.vec3.unit(v1);
        const u2 = vec.vec3.unit(v2);
        const axis = vec.vec3.cross(u1, u2);
        const cos = vec.vec3.dot(u1, u2);
        const sin = vec.vec3.length(axis);
        if (power === 1) {
            const unitAxis = vec.vec3.scale(axis, 1 / sin);
            return this.rotMat(cos, sin, ...unitAxis);
        }
        else {
            const newAngle = power * Math.atan2(sin, cos);
            return this.rotation(newAngle, axis);
        }
    }
    rotMat(cos, sin, x, y, z) {
        if (Number.isNaN(cos + sin + x + y + z)) {
            return this.identity();
        }
        const oneMinusCos = 1 - cos;
        const x1 = x * oneMinusCos;
        const y1 = y * oneMinusCos;
        const z1 = z * oneMinusCos;
        const xx = x * x1;
        const yy = y * y1;
        const zz = z * z1;
        const xy = x * y1;
        const yz = y * z1;
        const zx = z * x1;
        return [
            [xx + cos, xy + z * sin, zx - y * sin],
            [xy - z * sin, yy + cos, yz + x * sin],
            [zx + y * sin, yz - x * sin, zz + cos]
        ];
    }
    lookTowards(dir, up = [0, 1, 0]) {
        const z = vec.vec3.unit(vec.vec3.neg(dir));
        const x = vec.vec3.unit(vec.vec3.cross(up, z));
        const y = vec.vec3.cross(z, x);
        return this.transpose([x, y, z]);
    }
    cast(m) {
        return [
            [...m[0], 0],
            [...m[1], 0],
            [0, 0, 1]
        ];
    }
    apply(m, v) {
        return vec.vec3.addAll(vec.vec3.scale(m[0], v[0]), vec.vec3.scale(m[1], v[1]), vec.vec3.scale(m[2], v[2]));
    }
    neg(m) {
        return [
            vec.vec3.neg(m[0]),
            vec.vec3.neg(m[1]),
            vec.vec3.neg(m[2])
        ];
    }
    scale(m, f) {
        return [
            vec.vec3.scale(m[0], f),
            vec.vec3.scale(m[1], f),
            vec.vec3.scale(m[2], f)
        ];
    }
    add(m1, m2) {
        return [
            vec.vec3.add(m1[0], m2[0]),
            vec.vec3.add(m1[1], m2[1]),
            vec.vec3.add(m1[2], m2[2])
        ];
    }
    sub(m1, m2) {
        return [
            vec.vec3.sub(m1[0], m2[0]),
            vec.vec3.sub(m1[1], m2[1]),
            vec.vec3.sub(m1[2], m2[2])
        ];
    }
    mul(m1, m2) {
        return [
            this.apply(m1, m2[0]),
            this.apply(m1, m2[1]),
            this.apply(m1, m2[2])
        ];
    }
    determinant(m) {
        return vec.vec3.dot(vec.vec3.cross(m[0], m[1]), m[2]);
    }
    transpose(m) {
        return [
            [m[0][0], m[1][0], m[2][0]],
            [m[0][1], m[1][1], m[2][1]],
            [m[0][2], m[1][2], m[2][2]]
        ];
    }
    inverse(m) {
        const v1x2 = vec.vec3.cross(m[1], m[2]);
        const v2x0 = vec.vec3.cross(m[2], m[0]);
        const v0x1 = vec.vec3.cross(m[0], m[1]);
        const det = vec.vec3.dot(v0x1, m[2]);
        return this.scale(this.transpose([v1x2, v2x0, v0x1]), 1 / det);
    }
    columnMajorArray(m) {
        return [
            ...m[0],
            ...m[1],
            ...m[2]
        ];
    }
}
export class Mat2Math {
    from(array, offset = 0) {
        return [
            vec.vec2.from(array, offset),
            vec.vec2.from(array, offset + 2),
        ];
    }
    gen(...columns) {
        const column = columns[0];
        return columns.length == 1 ?
            () => [column(), column()] :
            () => [columns[0](), columns[1]()];
    }
    identity() {
        return this.diagonal(1, 1);
    }
    diagonal(...d) {
        return [
            [d[0], 0],
            [0, d[1]]
        ];
    }
    outer(v1, v2) {
        return [
            vec.vec2.scale(v1, v2[0]),
            vec.vec2.scale(v1, v2[1])
        ];
    }
    projectionOn(v) {
        return this.scale(this.outer(v, v), 1 / vec.vec2.lengthSquared(v));
    }
    scalingAlong(v, parallel = 1, perpendicular = 1) {
        if (parallel === perpendicular) {
            return this.diagonal(parallel, parallel);
        }
        const parallelProj = this.projectionOn(v);
        const perpendicularProj = this.sub(this.identity(), this.projectionOn(v));
        return this.add(parallel === 1 ? parallelProj : this.scale(parallelProj, parallel), perpendicular === 1 ? perpendicularProj : this.scale(perpendicularProj, perpendicular));
    }
    scaling(...diagonal) {
        return this.diagonal(...diagonal);
    }
    rotation(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            [+cos, +sin],
            [-sin, +cos]
        ];
    }
    apply(m, v) {
        return vec.vec2.add(vec.vec2.scale(m[0], v[0]), vec.vec2.scale(m[1], v[1]));
    }
    neg(m) {
        return [
            vec.vec2.neg(m[0]),
            vec.vec2.neg(m[1])
        ];
    }
    scale(m, f) {
        return [
            vec.vec2.scale(m[0], f),
            vec.vec2.scale(m[1], f)
        ];
    }
    add(m1, m2) {
        return [
            vec.vec2.add(m1[0], m2[0]),
            vec.vec2.add(m1[1], m2[1])
        ];
    }
    sub(m1, m2) {
        return [
            vec.vec2.sub(m1[0], m2[0]),
            vec.vec2.sub(m1[1], m2[1])
        ];
    }
    mul(m1, m2) {
        return [
            this.apply(m1, m2[0]),
            this.apply(m1, m2[1])
        ];
    }
    determinant(m) {
        return vec.vec2.cross(m[0], m[1]);
    }
    transpose(m) {
        return [
            [m[0][0], m[1][0]],
            [m[0][1], m[1][1]]
        ];
    }
    inverse(m) {
        return this.scale([
            [+m[1][1], -m[0][1]],
            [-m[1][0], +m[0][0]],
        ], 1 / this.determinant(m));
    }
    columnMajorArray(m) {
        return [
            ...m[0],
            ...m[1]
        ];
    }
}
export function coordinateSystem(math, s) {
    const invS = math.inverse(s);
    return m => math.mul(s, math.mul(m, invS));
}
export const mat4 = new Mat4Math();
export const mat3 = new Mat3Math();
export const mat2 = new Mat2Math();
