import { ether } from "/gen/libs.js"

export class MatricesGenerator {

    private _angle = Math.PI / 4;
    private _depth = 5;

    private branch2Matrix: ether.Mat<4> | null = null;
    private branch3Matrix: ether.Mat<4> | null = null;
    private branch1Matrix: ether.Mat<4> | null = null;
    
    readonly scale = Math.SQRT1_2;
    readonly branchCount = 3;
    readonly horizontalAngle = 2 * Math.PI / this.branchCount;

    readonly axis1: ether.Vec<3> = [1, 0, 0];
    readonly axis2: ether.Vec<3> = [Math.cos(this.horizontalAngle), 0, +Math.sin(this.horizontalAngle)]
    readonly axis3: ether.Vec<3> = [Math.cos(this.horizontalAngle), 0, -Math.sin(this.horizontalAngle)]
    readonly scaling = ether.mat4.scaling(this.scale, this.scale, this.scale); 
    readonly translation = ether.mat4.translation([0, 2, 0]);
    
    constructor() {
        this.init();
    }

    private init() {
        this.branch1Matrix = ether.mat4.mul(
            this.translation, 
            ether.mat4.mul(
                ether.mat4.rotation(this._angle, this.axis1), 
                this.scaling
            )
        );
        this.branch2Matrix = ether.mat4.mul(
            this.translation,
            ether.mat4.mul(
                ether.mat4.rotation(this._angle, this.axis2),
                this.scaling
            )
        );
        this.branch3Matrix = ether.mat4.mul(
            ether.mat4.translation([0, 2, 0]),
            ether.mat4.mul(
                ether.mat4.rotation(this._angle, this.axis3),
                this.scaling
            )
        );
    }

    generateMatrices(depth: number | null, angle: number | null) {
        this._depth = depth ?? this._depth
        this._angle = angle ?? this._angle
        this.init()
        const result: ether.Mat<4>[] = [];
        this.doGenerateMatrices(result, this._depth, ether.mat4.identity())
        return result;
    }

    private doGenerateMatrices(result: ether.Mat<4>[], depth: number, matrix: ether.Mat<4>) {
        result.push(matrix);
        if (depth > 0 && this.branch1Matrix && this.branch2Matrix && this.branch3Matrix) {
            this.doGenerateMatrices(result, depth - 1, ether.mat4.mul(matrix, this.branch1Matrix));
            this.doGenerateMatrices(result, depth - 1, ether.mat4.mul(matrix, this.branch2Matrix));
            this.doGenerateMatrices(result, depth - 1, ether.mat4.mul(matrix, this.branch3Matrix));
        }
    }

}
