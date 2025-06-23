import * as aether from "aether"

export class MatricesGenerator {

    private _angle = Math.PI / 4;
    private _depth = 5;

    private branch2Matrix: aether.Mat<4> | null = null;
    private branch3Matrix: aether.Mat<4> | null = null;
    private branch1Matrix: aether.Mat<4> | null = null;
    
    readonly scale = Math.SQRT1_2;
    readonly branchCount = 3;
    readonly horizontalAngle = 2 * Math.PI / this.branchCount;

    readonly axis1: aether.Vec<3> = [1, 0, 0];
    readonly axis2: aether.Vec<3> = [Math.cos(this.horizontalAngle), 0, +Math.sin(this.horizontalAngle)]
    readonly axis3: aether.Vec<3> = [Math.cos(this.horizontalAngle), 0, -Math.sin(this.horizontalAngle)]
    readonly scaling = aether.mat4.scaling(this.scale, this.scale, this.scale); 
    readonly translation = aether.mat4.translation([0, 2, 0]);
    
    constructor() {
        this.init();
    }

    private init() {
        this.branch1Matrix = aether.mat4.mul(
            this.translation, 
            aether.mat4.mul(
                aether.mat4.rotation(this._angle, this.axis1), 
                this.scaling
            )
        );
        this.branch2Matrix = aether.mat4.mul(
            this.translation,
            aether.mat4.mul(
                aether.mat4.rotation(this._angle, this.axis2),
                this.scaling
            )
        );
        this.branch3Matrix = aether.mat4.mul(
            this.translation,
            aether.mat4.mul(
                aether.mat4.rotation(this._angle, this.axis3),
                this.scaling
            )
        );
    }

    get depth(): number {
        return this._depth; 
    }

    get angle(): number {
        return this._angle; 
    }

    generateMatrices(depth: number | null, angle: number | null) {
        this._depth = depth ?? this._depth
        this._angle = angle ?? this._angle
        this.init()
        const result: aether.Mat<4>[] = [];
        this.doGenerateMatrices(result, this._depth, aether.mat4.translation([0, -2, 0]))
        return result;
    }

    private doGenerateMatrices(result: aether.Mat<4>[], depth: number, matrix: aether.Mat<4>) {
        result.push(matrix);
        if (depth > 0 && this.branch1Matrix && this.branch2Matrix && this.branch3Matrix) {
            this.doGenerateMatrices(result, depth - 1, aether.mat4.mul(matrix, this.branch1Matrix));
            this.doGenerateMatrices(result, depth - 1, aether.mat4.mul(matrix, this.branch2Matrix));
            this.doGenerateMatrices(result, depth - 1, aether.mat4.mul(matrix, this.branch3Matrix));
        }
    }

}
