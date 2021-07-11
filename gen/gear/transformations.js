import { Matrix, vec } from '../space/all.js';
export class Transformer {
    constructor(canvas, viewMatrix, speed = 8) {
        this.canvas = canvas;
        this.viewMatrix = viewMatrix;
        this.speed = speed;
        this._startRotationMatrix = Matrix.identity();
        this._startTranslationMatrix = Matrix.identity();
        this._startScaleMatrix = Matrix.identity();
        this._rotationMatrix = Matrix.identity();
        this._translationMatrix = Matrix.identity();
        this._scaleMatrix = Matrix.identity();
        this.rotation = dragging => {
            const v1 = this.inverseViewMatrix.prod(toVector(dragging.startPos, this.canvas));
            const v2 = this.inverseViewMatrix.prod(toVector(dragging.pos, this.canvas));
            const rotation = Matrix.crossProdRotation(v1, v2, 0, this.speed);
            this._rotationMatrix = rotation.by(this._startRotationMatrix);
            if (dragging.end) {
                this._startRotationMatrix = this._rotationMatrix;
            }
            return this._rotationMatrix;
        };
        this.translation = dragging => {
            const v1 = this.inverseViewMatrix.prod(toVector(dragging.startPos, this.canvas));
            const v2 = this.inverseViewMatrix.prod(toVector(dragging.pos, this.canvas));
            const translation = v2.minus(v1).scale(this.speed);
            this._translationMatrix = Matrix.translation(translation.coordinates[0], translation.coordinates[1], translation.coordinates[2]).by(this._startTranslationMatrix);
            if (dragging.end) {
                this._startTranslationMatrix = this._translationMatrix;
            }
            return this._translationMatrix;
        };
        this.scale = dragging => {
            const v1 = this.inverseViewMatrix.prod(toVector(dragging.startPos, this.canvas));
            const v2 = this.inverseViewMatrix.prod(toVector(dragging.pos, this.canvas));
            const scale = Math.pow((1 + v2.minus(v1).length), (v2.coordinates[1] > v1.coordinates[1] ? this.speed : -this.speed));
            this._scaleMatrix = Matrix.scaling(scale, scale, scale).by(this._startScaleMatrix);
            if (dragging.end) {
                this._startScaleMatrix = this._scaleMatrix;
            }
            return this._scaleMatrix;
        };
        this.inverseViewMatrix = viewMatrix.inverse;
    }
    get translationMatrix() {
        return this._translationMatrix;
    }
    get rotationMatrix() {
        return this._rotationMatrix;
    }
    get scaleMatrix() {
        return this._scaleMatrix;
    }
    get matrix() {
        return this._translationMatrix.by(this._rotationMatrix).by(this._scaleMatrix);
    }
    set translationMatrix(matrix) {
        this._startTranslationMatrix = matrix;
        this._translationMatrix = matrix;
    }
    set rotationMatrix(matrix) {
        this._startRotationMatrix = matrix;
        this._rotationMatrix = matrix;
    }
    set scaleMatrix(matrix) {
        this._startScaleMatrix = matrix;
        this._scaleMatrix = matrix;
    }
}
export function toVector(p, canvas) {
    return vec(p[0], p[1], -1, 1)
        .multiply(vec(2 / canvas.clientWidth, -2 / canvas.clientHeight, 1, 1))
        .minus(vec(1, -1, 0, 0));
}
//# sourceMappingURL=transformations.js.map