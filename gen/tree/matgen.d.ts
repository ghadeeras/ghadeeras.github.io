import * as Space from "../space/all.js";
export declare class MatriciesGenerator {
    private _verticalAngle;
    private _depth;
    private branch1Matrix;
    private branch2Matrix;
    private branch3Matrix;
    readonly scale: number;
    readonly branchCount = 3;
    readonly horizontalAngle: number;
    readonly axis1: Space.Vector;
    readonly axis2: Space.Vector;
    readonly axis3: Space.Vector;
    readonly scaling: Space.Matrix;
    readonly translation: Space.Matrix;
    constructor();
    private init;
    get verticalAngle(): number;
    set verticalAngle(value: number);
    get depth(): number;
    set depth(value: number);
    generateMatricies(): number[][];
    doGenerateMatricies(result: Space.Matrix[], depth: number, matrix: Space.Matrix): void;
}
//# sourceMappingURL=matgen.d.ts.map