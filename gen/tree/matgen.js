import * as Space from "../space/all.js";
export class MatriciesGenerator {
    constructor() {
        this._verticalAngle = Math.PI / 4;
        this._depth = 5;
        this.branch1Matrix = null;
        this.branch2Matrix = null;
        this.branch3Matrix = null;
        this.scale = Math.SQRT1_2;
        this.branchCount = 3;
        this.horizontalAngle = 2 * Math.PI / this.branchCount;
        this.axis1 = Space.vec(1, 0, 0);
        this.axis2 = Space.vec(Math.cos(this.horizontalAngle), 0, +Math.sin(this.horizontalAngle));
        this.axis3 = Space.vec(Math.cos(this.horizontalAngle), 0, -Math.sin(this.horizontalAngle));
        this.scaling = Space.Matrix.scaling(this.scale, this.scale, this.scale);
        this.translation = Space.Matrix.translation(0, 2, 0);
        this.init();
    }
    init() {
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
    set verticalAngle(value) {
        this._verticalAngle = value;
        this.init();
    }
    get depth() {
        return this._depth;
    }
    set depth(value) {
        this._depth = value;
    }
    generateMatricies() {
        const result = [];
        this.doGenerateMatricies(result, this._depth, Space.Matrix.identity());
        return result.map(matrix => matrix.asColumnMajorArray);
    }
    doGenerateMatricies(result, depth, matrix) {
        result.push(matrix);
        if (depth > 0 && this.branch1Matrix && this.branch2Matrix && this.branch3Matrix) {
            this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch1Matrix));
            this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch2Matrix));
            this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch3Matrix));
        }
    }
}
//# sourceMappingURL=matgen.js.map