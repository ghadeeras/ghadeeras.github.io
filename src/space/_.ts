/// <reference path="vector.ts" />
/// <reference path="matrix.ts" />

module Space {
    
    export function vec(...coordinates: number[]) {
        return new Vector(coordinates);
    }

    export function mat(...columns: Vector[]) {
        return new Matrix(columns);
    }

    export function diagonalMat(diagonalVector: Vector) {
        return new Matrix(diagonalVector.coordinates.map((c, i) => diagonalVector.component(i)));
    }

    export function identityMat(size: number) {
        const diagonals: number[] = [];
        while (diagonals.length < size) {
            diagonals.push(1);
        }
        return diagonalMat(new Vector(diagonals));
    }
    
}