module Space {

    export class Matrix {

        constructor(readonly columns: Vector[]) {
        }

        transposed() {
            const rowsCount = this.columns.map(column => column.length).reduce((a, b) => a > b ? a : b, 0);
            const rows: Vector[] = []; 
            for (let i = 0; i < rowsCount; i++) {
                rows.push(new Vector(this.columns.map(column => column.coordinates[i] || 0)));
            }
            return new Matrix(rows);
        }

        prod(vector: Vector) {
            const m = this.transposed();
            return vector.prod(m);
        }

        by(matrix: Matrix) {
            const m = this.transposed();
            return new Matrix(matrix.columns.map(column => column.prod(m)));
        }

    }
}