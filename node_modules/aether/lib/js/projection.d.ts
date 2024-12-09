import { Mat4 } from "./matrix.js";
export declare class PerspectiveProjection {
    readonly near: number;
    readonly far: number | null;
    readonly reversedZ: boolean;
    readonly legacy: boolean;
    private _matrix;
    private _inverseMatrix;
    constructor(near: number, far?: number | null, reversedZ?: boolean, legacy?: boolean);
    matrices(focalLength: number, aspectRatio: number): [Mat4, Mat4];
    matrix(focalLength: number, aspectRatio: number): Mat4;
    inverseMatrix(focalLength: number, aspectRatio: number): Mat4;
    private infinite;
    private finite;
}
