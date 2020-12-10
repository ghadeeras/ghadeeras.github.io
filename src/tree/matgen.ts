import * as Space from "../space/all.js"

export class MatriciesGenerator {

    private _verticalAngle = Math.PI / 4;
    private _depth = 5;

    private branch1Matrix: Space.Matrix | null = null;
    private branch2Matrix: Space.Matrix | null = null;
    private branch3Matrix: Space.Matrix | null = null;
    
    readonly scale = Math.SQRT1_2;
    readonly branchCount = 3;
    readonly horizontalAngle = 2 * Math.PI / this.branchCount;

    readonly axis1 = Space.vec(1, 0, 0);
    readonly axis2 = Space.vec(Math.cos(this.horizontalAngle), 0, +Math.sin(this.horizontalAngle))
    readonly axis3 = Space.vec(Math.cos(this.horizontalAngle), 0, -Math.sin(this.horizontalAngle))
    readonly scaling = Space.Matrix.scaling(this.scale, this.scale, this.scale); 
    readonly translation = Space.Matrix.translation(0, 2, 0);
    
    constructor() {
        this.init();
    }

    private init() {
        this.branch1Matrix = this.translation
            .by(Space.Matrix.rotation(this._verticalAngle, this.axis1))
            .by(this.scaling);
        this.branch2Matrix = this.translation
            .by(Space.Matrix.rotation(this._verticalAngle, this.axis2))
            .by(this.scaling);
        this.branch3Matrix = Space.Matrix.translation(0, 2, 0)
            .by(Space.Matrix.rotation(this._verticalAngle, this.axis3))
            .by(this.scaling);
    }

    get verticalAngle() {
        return this._verticalAngle;
    }

    set verticalAngle(value: number) {
        this._verticalAngle = value;
        this.init();
    }

    get depth() {
        return this._depth;
    }

    set depth(value: number) {
        this._depth = value;
    }

    generateMatricies() {
        const result: Space.Matrix[] = [];
        this.doGenerateMatricies(result, this._depth, Space.Matrix.identity())
        return result.map(matrix => matrix.asColumnMajorArray);
    }

    doGenerateMatricies(result: Space.Matrix[], depth: number, matrix: Space.Matrix) {
        result.push(matrix);
        if (depth > 0 && this.branch1Matrix && this.branch2Matrix && this.branch3Matrix) {
            this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch1Matrix));
            this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch2Matrix));
            this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch3Matrix));
        }
    }

}
