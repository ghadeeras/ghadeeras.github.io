import { Vector } from "./vector.js";
import { vec, mat } from "./utils.js";
export class Matrix {
    constructor(columns) {
        this.columnsCount = columns.length;
        this.rowsCount = columns.map(column => column.coordinates.length).reduce((a, b) => a > b ? a : b, 0);
        this.columns = columns.map(column => column.withDims(this.rowsCount));
    }
    get transposed() {
        const rows = new Array(this.rowsCount);
        for (let i = 0; i < this.rowsCount; i++) {
            rows[i] = new Vector(this.columns.map(column => column.coordinates[i]));
        }
        return new Matrix(rows);
    }
    get determinant() {
        if (this.rowsCount != this.columnsCount) {
            return 0;
        }
        if (this.columnsCount == 1) {
            return this.columns[0].coordinates[0];
        }
        return this.columns[0].coordinates.map((v, i) => Matrix.sign(i) * v * this.sub(0, i).determinant).reduce((v1, v2) => v1 + v2);
    }
    get inverse() {
        const d = this.determinant;
        return new Matrix(this.columns.map((column, c) => new Vector(column.coordinates.map((coordinate, r) => Matrix.sign(c + r) * this.sub(c, r).determinant / d)))).transposed;
    }
    static sign(i) {
        return (i % 2 == 0) ? 1 : -1;
    }
    sub(columnIndex, rowIndex) {
        const columns = [];
        for (let c = 0; c < this.columnsCount; c++) {
            if (c == columnIndex) {
                continue;
            }
            const coordinates = [];
            const column = this.columns[c];
            for (let r = 0; r < this.rowsCount; r++) {
                if (r == rowIndex) {
                    continue;
                }
                coordinates.push(column.coordinates[r]);
            }
            columns.push(new Vector(coordinates));
        }
        return new Matrix(columns);
    }
    prod(vector) {
        const m = this.transposed;
        return vector.prod(m);
    }
    by(matrix) {
        const m = this.transposed;
        return new Matrix(matrix.columns.map(column => column.prod(m)));
    }
    get asColumnMajorArray() {
        const result = new Array(this.rowsCount * this.columnsCount);
        let index = 0;
        for (let i = 0; i < this.columnsCount; i++) {
            for (let j = 0; j < this.rowsCount; j++) {
                result[index] = this.columns[i].coordinates[j];
                index++;
            }
        }
        return result;
    }
    get asRowMajorArray() {
        return this.transposed.asColumnMajorArray;
    }
    static identity() {
        return this.scaling(1, 1, 1);
    }
    static scaling(sx, sy, sz) {
        return mat(vec(sx, 0, 0, 0), vec(0, sy, 0, 0), vec(0, 0, sz, 0), vec(0, 0, 0, 1));
    }
    static translation(tx, ty, tz) {
        return mat(vec(1, 0, 0, 0), vec(0, 1, 0, 0), vec(0, 0, 1, 0), vec(tx, ty, tz, 1));
    }
    static rotation(angle, axis) {
        const a = axis.withDims(3).unit;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const oneMinusCos = 1 - cos;
        const [x, y, z] = a.coordinates;
        const [xx, yy, zz, xy, yz, zx] = [x * x, y * y, z * z, x * y, y * z, z * x];
        return mat(vec(xx * oneMinusCos + cos, xy * oneMinusCos + z * sin, zx * oneMinusCos - y * sin, 0), vec(xy * oneMinusCos - z * sin, yy * oneMinusCos + cos, yz * oneMinusCos + x * sin, 0), vec(zx * oneMinusCos + y * sin, yz * oneMinusCos - x * sin, zz * oneMinusCos + cos, 0), vec(0, 0, 0, 1));
    }
    static view(direction, up) {
        const z = direction.withDims(3).scale(-1).unit;
        const x = up.withDims(3).cross(z).unit;
        const y = z.cross(x).unit;
        return mat(x, y, z, vec(0, 0, 0, 1)).transposed;
    }
    static globalView(eyePos, objPos, up) {
        const direction = objPos.minus(eyePos);
        return Matrix.view(direction, up).by(Matrix.translation(-eyePos.coordinates[0], -eyePos.coordinates[1], -eyePos.coordinates[2]));
    }
    static project(focalRatio, horizon, aspectRatio = 1) {
        const focalLength = 2 * focalRatio;
        const range = focalLength - horizon;
        return mat(vec(focalLength / aspectRatio, 0, 0, 0), vec(0, focalLength, 0, 0), vec(0, 0, (focalLength + horizon) / range, -1), vec(0, 0, 2 * focalLength * horizon / range, 0));
    }
}
export class MatrixStack {
    constructor() {
        this._matrix = Matrix.identity();
        this.stack = [];
    }
    apply(matrix) {
        return this._matrix = this._matrix.by(matrix);
    }
    push() {
        this.stack.push(this._matrix);
    }
    pop() {
        var _a;
        this._matrix = (_a = this.stack.pop()) !== null && _a !== void 0 ? _a : Matrix.identity();
    }
    get matrix() {
        return this._matrix;
    }
}
//# sourceMappingURL=matrix.js.map