import { Vector } from "./vector.js";
export declare class Matrix {
    readonly columnsCount: number;
    readonly rowsCount: number;
    readonly columns: Vector[];
    constructor(columns: Vector[]);
    get transposed(): Matrix;
    get determinant(): number;
    get inverse(): Matrix;
    private static sign;
    private sub;
    prod(vector: Vector): Vector;
    by(matrix: Matrix): Matrix;
    get asColumnMajorArray(): number[];
    get asRowMajorArray(): number[];
    static identity(): Matrix;
    static scaling(sx: number, sy: number, sz: number): Matrix;
    static translation(tx: number, ty: number, tz: number): Matrix;
    static rotation(angle: number, axis: Vector): Matrix;
    static view(direction: Vector, up: Vector): Matrix;
    static globalView(eyePos: Vector, objPos: Vector, up: Vector): Matrix;
    static project(focalRatio: number, horizon: number, aspectRatio?: number): Matrix;
}
export declare class MatrixStack {
    private _matrix;
    private stack;
    apply(matrix: Matrix): Matrix;
    push(): void;
    pop(): void;
    get matrix(): Matrix;
}
//# sourceMappingURL=matrix.d.ts.map