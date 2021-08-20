import { Mat, mat4, vec4, vec3 } from "../../ether/latest/index.js";
import { Dragging, PointerPosition } from './ui-input.js';
import * as utils from './utils.js'

export class Transformer {

    private _startRotationMatrix: Mat<4> = mat4.identity()
    private _startTranslationMatrix: Mat<4> = mat4.identity()
    private _startScaleMatrix: Mat<4> = mat4.identity()

    private _rotationMatrix: Mat<4> = mat4.identity()
    private _translationMatrix: Mat<4> = mat4.identity()
    private _scaleMatrix: Mat<4> = mat4.identity()

    private inverseViewMatrix: Mat<4>

    constructor(private canvas: HTMLElement, private viewMatrix: Mat<4>, private speed: number = 8) {
        this.inverseViewMatrix = mat4.inverse(viewMatrix)
    }

    get translationMatrix() {
        return this._translationMatrix
    }

    get rotationMatrix() {
        return this._rotationMatrix
    }

    get scaleMatrix() {
        return this._scaleMatrix
    }

    get matrix() {
        return mat4.mul(this._translationMatrix, mat4.mul(this._rotationMatrix, this._scaleMatrix))
    }

    set translationMatrix(matrix: Mat<4>) {
        this._startTranslationMatrix = matrix
        this._translationMatrix = matrix
    }

    set rotationMatrix(matrix: Mat<4>) {
        this._startRotationMatrix = matrix
        this._rotationMatrix = matrix
    }

    set scaleMatrix(matrix: Mat<4>) {
        this._startScaleMatrix = matrix
        this._scaleMatrix = matrix
    }

    readonly rotation: utils.Mapper<Dragging, Mat<4>> = dragging => {
        const v1 = mat4.apply(this.inverseViewMatrix, toVector(dragging.startPos, this.canvas))
        const v2 = mat4.apply(this.inverseViewMatrix, toVector(dragging.pos, this.canvas))
        const rotation = mat4.crossProdRotation(vec3.swizzle(v1, 0, 1, 2), vec3.swizzle(v2, 0, 1, 2), this.speed)
        this._rotationMatrix = mat4.mul(rotation, this._startRotationMatrix)
        if (dragging.end) {
            this._startRotationMatrix = this._rotationMatrix
        }
        return this._rotationMatrix
    }
    
    readonly translation: utils.Mapper<Dragging, Mat<4>> = dragging => {
        const v1 = mat4.apply(this.inverseViewMatrix, toVector(dragging.startPos, this.canvas))
        const v2 = mat4.apply(this.inverseViewMatrix, toVector(dragging.pos, this.canvas))
        const translation = vec4.scale(vec4.sub(v2, v1), this.speed)
        this._translationMatrix = mat4.mul(
            mat4.translation(vec3.swizzle(translation, 0, 1, 2)),
            this._startTranslationMatrix
        )
        if (dragging.end) {
            this._startTranslationMatrix = this._translationMatrix
        }
        return this._translationMatrix
    }
    
    readonly scale: utils.Mapper<Dragging, Mat<4>> = dragging => {
        const v1 = mat4.apply(this.inverseViewMatrix, toVector(dragging.startPos, this.canvas))
        const v2 = mat4.apply(this.inverseViewMatrix, toVector(dragging.pos, this.canvas))
        const power = this.speed * (v2[1] - v1[1]);
        const scale = Math.pow(2, power)
        this._scaleMatrix = mat4.mul(mat4.scaling(scale, scale, scale), this._startScaleMatrix)
        if (dragging.end) {
            this._startScaleMatrix = this._scaleMatrix
        }
        return this._scaleMatrix
    }

}


export function toVector(p: PointerPosition, canvas: HTMLElement) {
    return vec4.sub(
        vec4.mul(
            [p[0], p[1], -1, 1], 
            [2 / canvas.clientWidth, -2 / canvas.clientHeight, 1, 1]
        ),
        [1, -1, 0, 0]
    );
}
