module Space {

    export class Matrix {

        readonly columnsCount: number;
        readonly rowsCount: number;
        readonly columns: Vector[]

        constructor(columns: Vector[]) {
            this.columnsCount = columns.length;
            this.rowsCount = columns.map(column => column.coordinates.length).reduce((a, b) => a > b ? a : b, 0);
            this.columns = columns.map(column => column.withDims(this.rowsCount));
        }

        get transposed() {
            const rows: Vector[] = new Array<Vector>(this.rowsCount); 
            for (let i = 0; i < this.rowsCount; i++) {
                rows[i] = new Vector(this.columns.map(column => column.coordinates[i]));
            }
            return new Matrix(rows);
        }

        prod(vector: Vector) {
            const m = this.transposed;
            return vector.prod(m);
        }

        by(matrix: Matrix) {
            const m = this.transposed;
            return new Matrix(matrix.columns.map(column => column.prod(m)));
        }

        get asColumnMajorArray() {
            const result: number[] = new Array<number>(this.rowsCount * this.columnsCount);
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

        static scaling(sx: number, sy: number, sz: number) {
            return mat(
                vec(sx,  0,  0, 0),
                vec( 0, sy,  0, 0),
                vec( 0,  0, sz, 0),
                vec( 0,  0,  0, 1),
            );
        }

        static translation(tx: number, ty: number, tz: number) {
            return mat(
                vec( 1,  0,  0, 0),
                vec( 0,  1,  0, 0),
                vec( 0,  0,  1, 0),
                vec(tx, ty, tz, 1),
            );
        }

        static rotation(angle: number, axis: Vector) {
            const a = axis.withDims(3).unit;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const oneMinusCos = 1 - cos;
            const [x, y, z] = a.coordinates;
            const [xx, yy, zz, xy, yz, zx] = [x * x, y * y, z * z, x * y, y * z, z * x];
            return mat(
                vec(xx * oneMinusCos +     cos, xy * oneMinusCos + z * sin, zx * oneMinusCos - y * sin, 0),
                vec(xy * oneMinusCos - z * sin, yy * oneMinusCos +     cos, yz * oneMinusCos + x * sin, 0),
                vec(zx * oneMinusCos + y * sin, yz * oneMinusCos - x * sin, zz * oneMinusCos +     cos, 0),
                vec(                         0,                          0,                          0, 1)
            );
        }

        static view(direction: Vector, up: Vector) {
            const z = direction.withDims(3).scale(-1).unit;
            const x = up.withDims(3).cross(z).unit;
            const y = z.cross(x).unit;
            return mat(x, y, z, vec(0, 0, 0, 1)).transposed;
        }

        static globalView(eyePos: Vector, objPos: Vector, up: Vector) {
            const direction = objPos.minus(eyePos);
            return Matrix.view(direction, up).by(Matrix.translation(-eyePos.coordinates[0], -eyePos.coordinates[1], -eyePos.coordinates[2]));
        }
        
        static project(focalRatio: number, horizon: number, aspectRatio = 1) {
            const focalLength = 2 * focalRatio;
            const range = focalLength - horizon;
            return mat(
                vec(focalLength / aspectRatio,           0,                                 0,  0),
                vec(                        0, focalLength,                                 0,  0),
                vec(                        0,           0,   (focalLength + horizon) / range, -1),
                vec(                        0,           0, 2 * focalLength * horizon / range,  0)
            );
        }

    }

    export class MatrixStack {

        private _matrix = Matrix.identity();

        private stack: Matrix[];

        apply(matrix: Matrix) {
            return this._matrix = this._matrix.by(matrix);
        }

        push() {
            this.stack.push(this._matrix);
        }

        pop() {
            this._matrix = this.stack.pop();
        }

        get matrix() {
            return this._matrix;
        }

    }

}