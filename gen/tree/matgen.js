import { mat4 } from "../space/all.js";
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
        this.axis1 = [1, 0, 0];
        this.axis2 = [Math.cos(this.horizontalAngle), 0, +Math.sin(this.horizontalAngle)];
        this.axis3 = [Math.cos(this.horizontalAngle), 0, -Math.sin(this.horizontalAngle)];
        this.scaling = mat4.scaling(this.scale, this.scale, this.scale);
        this.translation = mat4.translation([0, 2, 0]);
        this.init();
    }
    init() {
        this.branch1Matrix = mat4.mul(this.translation, mat4.mul(mat4.rotation(this._verticalAngle, this.axis1), this.scaling));
        this.branch2Matrix = mat4.mul(this.translation, mat4.mul(mat4.rotation(this._verticalAngle, this.axis2), this.scaling));
        this.branch3Matrix = mat4.mul(mat4.translation([0, 2, 0]), mat4.mul(mat4.rotation(this._verticalAngle, this.axis3), this.scaling));
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
        this.doGenerateMatricies(result, this._depth, mat4.identity());
        return result.map(matrix => mat4.columnMajorArray(matrix));
    }
    doGenerateMatricies(result, depth, matrix) {
        result.push(matrix);
        if (depth > 0 && this.branch1Matrix && this.branch2Matrix && this.branch3Matrix) {
            this.doGenerateMatricies(result, depth - 1, mat4.mul(matrix, this.branch1Matrix));
            this.doGenerateMatricies(result, depth - 1, mat4.mul(matrix, this.branch2Matrix));
            this.doGenerateMatricies(result, depth - 1, mat4.mul(matrix, this.branch3Matrix));
        }
    }
}
//# sourceMappingURL=matgen.js.map