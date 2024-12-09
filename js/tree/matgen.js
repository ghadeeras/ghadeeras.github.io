import * as aether from "aether";
export class MatricesGenerator {
    constructor() {
        this._angle = Math.PI / 4;
        this._depth = 5;
        this.branch2Matrix = null;
        this.branch3Matrix = null;
        this.branch1Matrix = null;
        this.scale = Math.SQRT1_2;
        this.branchCount = 3;
        this.horizontalAngle = 2 * Math.PI / this.branchCount;
        this.axis1 = [1, 0, 0];
        this.axis2 = [Math.cos(this.horizontalAngle), 0, +Math.sin(this.horizontalAngle)];
        this.axis3 = [Math.cos(this.horizontalAngle), 0, -Math.sin(this.horizontalAngle)];
        this.scaling = aether.mat4.scaling(this.scale, this.scale, this.scale);
        this.translation = aether.mat4.translation([0, 2, 0]);
        this.init();
    }
    init() {
        this.branch1Matrix = aether.mat4.mul(this.translation, aether.mat4.mul(aether.mat4.rotation(this._angle, this.axis1), this.scaling));
        this.branch2Matrix = aether.mat4.mul(this.translation, aether.mat4.mul(aether.mat4.rotation(this._angle, this.axis2), this.scaling));
        this.branch3Matrix = aether.mat4.mul(aether.mat4.translation([0, 2, 0]), aether.mat4.mul(aether.mat4.rotation(this._angle, this.axis3), this.scaling));
    }
    generateMatrices(depth, angle) {
        this._depth = depth ?? this._depth;
        this._angle = angle ?? this._angle;
        this.init();
        const result = [];
        this.doGenerateMatrices(result, this._depth, aether.mat4.identity());
        return result;
    }
    doGenerateMatrices(result, depth, matrix) {
        result.push(matrix);
        if (depth > 0 && this.branch1Matrix && this.branch2Matrix && this.branch3Matrix) {
            this.doGenerateMatrices(result, depth - 1, aether.mat4.mul(matrix, this.branch1Matrix));
            this.doGenerateMatrices(result, depth - 1, aether.mat4.mul(matrix, this.branch2Matrix));
            this.doGenerateMatrices(result, depth - 1, aether.mat4.mul(matrix, this.branch3Matrix));
        }
    }
}
//# sourceMappingURL=matgen.js.map