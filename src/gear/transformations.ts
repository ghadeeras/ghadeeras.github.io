import { Matrix, vec } from '../space/all.js';
import { Dragging, PointerPosition } from './ui-input.js';
import * as utils from './utils.js'

export class Transformer {

    private _startRotationMatrix: Matrix = Matrix.identity()
    private _startTranslationMatrix: Matrix = Matrix.identity()
    private _startScaleMatrix: Matrix = Matrix.identity()

    private _rotationMatrix: Matrix = Matrix.identity()
    private _translationMatrix: Matrix = Matrix.identity()
    private _scaleMatrix: Matrix = Matrix.identity()

    private inverseViewMatrix: Matrix

    constructor(private canvas: HTMLElement, private viewMatrix: Matrix, private speed: number = 8) {
        this.inverseViewMatrix = viewMatrix.inverse
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
        return this._translationMatrix.by(this._rotationMatrix).by(this._scaleMatrix)
    }

    set translationMatrix(matrix: Matrix) {
        this._startTranslationMatrix = matrix
        this._translationMatrix = matrix
    }

    set rotationMatrix(matrix: Matrix) {
        this._startRotationMatrix = matrix
        this._rotationMatrix = matrix
    }

    set scaleMatrix(matrix: Matrix) {
        this._startScaleMatrix = matrix
        this._scaleMatrix = matrix
    }

    readonly rotation: utils.Mapper<Dragging, Matrix> = dragging => {
        const v1 = this.inverseViewMatrix.prod(toVector(dragging.startPos, this.canvas))
        const v2 = this.inverseViewMatrix.prod(toVector(dragging.pos, this.canvas))
        const rotation = Matrix.crossProdRotation(v1, v2, 0, this.speed)
        this._rotationMatrix = rotation.by(this._startRotationMatrix)
        if (dragging.end) {
            this._startRotationMatrix = this._rotationMatrix
        }
        return this._rotationMatrix
    }
    
    readonly translation: utils.Mapper<Dragging, Matrix> = dragging => {
        const v1 = this.inverseViewMatrix.prod(toVector(dragging.startPos, this.canvas))
        const v2 = this.inverseViewMatrix.prod(toVector(dragging.pos, this.canvas))
        const translation = v2.minus(v1).scale(this.speed)
        this._translationMatrix = Matrix.translation(
            translation.coordinates[0], 
            translation.coordinates[1], 
            translation.coordinates[2]
        ).by(this._startTranslationMatrix)
        if (dragging.end) {
            this._startTranslationMatrix = this._translationMatrix
        }
        return this._translationMatrix
    }
    
    readonly scale: utils.Mapper<Dragging, Matrix> = dragging => {
        const v1 = this.inverseViewMatrix.prod(toVector(dragging.startPos, this.canvas))
        const v2 = this.inverseViewMatrix.prod(toVector(dragging.pos, this.canvas))
        const scale = Math.pow((1 + v2.minus(v1).length), (v2.coordinates[1] > v1.coordinates[1] ? this.speed : -this.speed))
        this._scaleMatrix = Matrix.scaling(scale, scale, scale).by(this._startScaleMatrix)
        if (dragging.end) {
            this._startScaleMatrix = this._scaleMatrix
        }
        return this._scaleMatrix
    }

}


export function toVector(p: PointerPosition, canvas: HTMLElement) {
    return vec(p[0], p[1], -1, 1)
        .multiply(vec(2 / canvas.clientWidth, -2 / canvas.clientHeight, 1, 1))
        .minus(vec(1, -1, 0, 0));
}
