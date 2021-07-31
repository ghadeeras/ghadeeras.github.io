import * as vec from "./vector.js";
export class Mat4Math {
    identity() {
        return this.scaling(1, 1, 1);
    }
    scaling(...diagonal) {
        return [
            [diagonal[0], 0, 0, 0],
            [0, diagonal[1], 0, 0],
            [0, 0, diagonal[2], 0],
            [0, 0, 0, 1]
        ];
    }
    translation(t) {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [...t, 1]
        ];
    }
    rotation(angle, axis) {
        const [x, y, z] = vec.vec3.unit(axis);
        if (Number.isNaN(x + y + z)) {
            return mat4.identity();
        }
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const oneMinusCos = 1 - cos;
        const [xx, yy, zz, xy, yz, zx] = [x * x, y * y, z * z, x * y, y * z, z * x];
        return [
            [xx * oneMinusCos + cos, xy * oneMinusCos + z * sin, zx * oneMinusCos - y * sin, 0],
            [xy * oneMinusCos - z * sin, yy * oneMinusCos + cos, yz * oneMinusCos + x * sin, 0],
            [zx * oneMinusCos + y * sin, yz * oneMinusCos - x * sin, zz * oneMinusCos + cos, 0],
            [0, 0, 0, 1]
        ];
    }
    crossProdRotation(v1, v2, power) {
        const u1 = vec.vec3.unit(v1);
        const u2 = vec.vec3.unit(v2);
        const axis = vec.vec3.cross(u1, u2);
        const sin = vec.vec3.length(axis);
        const cos = vec.vec3.dot(u1, u2);
        const angle = Math.atan2(sin, cos);
        return Number.isNaN(angle) ? this.identity() : this.rotation(power * angle, axis);
    }
    lookTowards(pos, dir = [0, 0, -1], up = [0, 1, 0]) {
        return mat4.mul(this.cast(mat3.lookTowards(dir, up)), this.translation(vec.vec3.neg(pos)));
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
        return vec.vec4.prod(v, this.transpose(m));
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
        const m1Rows = this.transpose(m1);
        return this.transpose([
            vec.vec4.prod(m1Rows[0], m2),
            vec.vec4.prod(m1Rows[1], m2),
            vec.vec4.prod(m1Rows[2], m2),
            vec.vec4.prod(m1Rows[3], m2)
        ]);
    }
    determinant(m) {
        const col0 = m[0];
        return (col0[0] * this.subDet(m, 0, 0) -
            col0[1] * this.subDet(m, 0, 1) +
            col0[2] * this.subDet(m, 0, 2) -
            col0[3] * this.subDet(m, 0, 3));
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
        return this.scale([
            [+this.subDet(m, 0, 0), -this.subDet(m, 1, 0), +this.subDet(m, 2, 0), -this.subDet(m, 3, 0)],
            [-this.subDet(m, 0, 1), +this.subDet(m, 1, 1), -this.subDet(m, 2, 1), +this.subDet(m, 3, 1)],
            [+this.subDet(m, 0, 2), -this.subDet(m, 1, 2), +this.subDet(m, 2, 2), -this.subDet(m, 3, 2)],
            [-this.subDet(m, 0, 3), +this.subDet(m, 1, 3), -this.subDet(m, 2, 3), +this.subDet(m, 3, 3)]
        ], 1 / this.determinant(m));
    }
    columnMajorArray(m) {
        return [
            ...m[0],
            ...m[1],
            ...m[2],
            ...m[3]
        ];
    }
    subDet(m, col, row) {
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
    identity() {
        return this.scaling(1, 1, 1);
    }
    scaling(...diagonal) {
        return [
            [diagonal[0], 0, 0],
            [0, diagonal[1], 0],
            [0, 0, diagonal[2]]
        ];
    }
    rotation(angle, axis) {
        const [x, y, z] = vec.vec3.unit(axis);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const oneMinusCos = 1 - cos;
        const [xx, yy, zz, xy, yz, zx] = [x * x, y * y, z * z, x * y, y * z, z * x];
        return [
            [xx * oneMinusCos + cos, xy * oneMinusCos + z * sin, zx * oneMinusCos - y * sin],
            [xy * oneMinusCos - z * sin, yy * oneMinusCos + cos, yz * oneMinusCos + x * sin],
            [zx * oneMinusCos + y * sin, yz * oneMinusCos - x * sin, zz * oneMinusCos + cos]
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
        return vec.vec3.prod(v, this.transpose(m));
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
        const m1Rows = this.transpose(m1);
        return this.transpose([
            vec.vec3.prod(m1Rows[0], m2),
            vec.vec3.prod(m1Rows[1], m2),
            vec.vec3.prod(m1Rows[2], m2)
        ]);
    }
    determinant(m) {
        const col0 = m[0];
        return (col0[0] * this.subDet(m, 0, 0) -
            col0[1] * this.subDet(m, 0, 1) +
            col0[2] * this.subDet(m, 0, 2));
    }
    transpose(m) {
        return [
            [m[0][0], m[1][0], m[2][0]],
            [m[0][1], m[1][1], m[2][1]],
            [m[0][2], m[1][2], m[2][2]]
        ];
    }
    inverse(m) {
        return this.scale([
            [+this.subDet(m, 0, 0), -this.subDet(m, 1, 0), +this.subDet(m, 2, 1)],
            [-this.subDet(m, 0, 1), +this.subDet(m, 1, 1), -this.subDet(m, 2, 1)],
            [+this.subDet(m, 0, 2), -this.subDet(m, 1, 2), +this.subDet(m, 2, 2)]
        ], 1 / this.determinant(m));
    }
    columnMajorArray(m) {
        return [
            ...m[0],
            ...m[1],
            ...m[2]
        ];
    }
    subDet(m, col, row) {
        return mat2.determinant(this.subMat(m, col, row));
    }
    subMat(m, col, row) {
        const m3x4 = vec.deleteComponent(m, col);
        return [
            vec.deleteComponent(m3x4[0], row),
            vec.deleteComponent(m3x4[1], row)
        ];
    }
}
export class Mat2Math {
    identity() {
        return this.scaling(1, 1);
    }
    scaling(...diagonal) {
        return [
            [diagonal[0], 0],
            [0, diagonal[1]]
        ];
    }
    apply(m, v) {
        return vec.vec2.prod(v, this.transpose(m));
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
        const m1Rows = this.transpose(m1);
        return this.transpose([
            vec.vec2.prod(m1Rows[0], m2),
            vec.vec2.prod(m1Rows[1], m2)
        ]);
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
export const mat4 = new Mat4Math();
export const mat3 = new Mat3Math();
export const mat2 = new Mat2Math();
//# sourceMappingURL=matrix.js.map