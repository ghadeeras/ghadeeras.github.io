import { Matrix } from "matrix.js";
export declare class Vector {
    readonly coordinates: number[];
    constructor(coordinates: number[]);
    combine(v: Vector, op: (c: number, vc: number) => number): Vector;
    affect(f: (c: number) => number): Vector;
    plus(v: Vector): Vector;
    minus(v: Vector): Vector;
    multiply(v: Vector): Vector;
    divide(v: Vector): Vector;
    scale(factor: number): Vector;
    dot(v: Vector): number;
    mix(v: Vector, weight: number): Vector;
    get lengthSquared(): number;
    get length(): number;
    get unit(): Vector;
    angle(v: Vector): number;
    withDims(n: number): Vector;
    swizzle(...indexes: number[]): Vector;
    cross(v: Vector): Vector;
    sameAs(v: Vector, precision?: number): boolean;
    prod(matrix: Matrix): Vector;
    component(i: number): Vector;
}
//# sourceMappingURL=vector.d.ts.map