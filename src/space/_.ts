/// <reference path="vector.ts" />
/// <reference path="matrix.ts" />

module Space {
    
    export function vec(...coordinates: number[]) {
        return new Vector(coordinates);
    }

    export function mat(...columns: Vector[]) {
        return new Matrix(columns);
    }

}