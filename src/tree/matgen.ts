import type { Mat4, Vec3 } from "aether";
import { mat4, vec3 } from "aether";

export class MatricesGenerator {

    private _angle = Math.PI / 4;
    private _depth = 5;

    private branch2Matrix: Mat4 | null = null;
    private branch3Matrix: Mat4 | null = null;
    private branch1Matrix: Mat4 | null = null;
    
    readonly scale = Math.SQRT1_2;
    readonly branchCount = 3;
    readonly horizontalAngle = 2 * Math.PI / this.branchCount;

    readonly axis1: Vec3 = vec3.polarY(                    0)
    readonly axis2: Vec3 = vec3.polarY(+this.horizontalAngle)
    readonly axis3: Vec3 = vec3.polarY(-this.horizontalAngle)
    readonly scaling = mat4.scaling(this.scale, this.scale, this.scale); 
    readonly translation = mat4.translation([0, 2, 0]);
    
    constructor() {
        this.init();
    }

    private init() {
        this.branch1Matrix = mat4.mul(
            this.translation, 
            mat4.mul(
                mat4.rotation(this._angle, this.axis1), 
                this.scaling
            )
        );
        this.branch2Matrix = mat4.mul(
            this.translation,
            mat4.mul(
                mat4.rotation(this._angle, this.axis2),
                this.scaling
            )
        );
        this.branch3Matrix = mat4.mul(
            this.translation,
            mat4.mul(
                mat4.rotation(this._angle, this.axis3),
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
        const result: Mat4[] = [];
        this.doGenerateMatrices(result, this._depth, mat4.translation([0, -2, 0]))
        return result;
    }

    private doGenerateMatrices(result: Mat4[], depth: number, matrix: Mat4) {
        result.push(matrix);
        if (depth > 0 && this.branch1Matrix && this.branch2Matrix && this.branch3Matrix) {
            this.doGenerateMatrices(result, depth - 1, mat4.mul(matrix, this.branch1Matrix));
            this.doGenerateMatrices(result, depth - 1, mat4.mul(matrix, this.branch2Matrix));
            this.doGenerateMatrices(result, depth - 1, mat4.mul(matrix, this.branch3Matrix));
        }
    }

}
