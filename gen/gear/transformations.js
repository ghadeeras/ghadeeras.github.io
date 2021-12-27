import { mat4, vec4, vec3 } from "../../aether/latest/index.js";
export class Transformer {
    constructor(canvas, _viewMatrix, speed = 8) {
        this.canvas = canvas;
        this._viewMatrix = _viewMatrix;
        this.speed = speed;
        this._startRotationMatrix = mat4.identity();
        this._startTranslationMatrix = mat4.identity();
        this._startScaleMatrix = mat4.identity();
        this._rotationMatrix = mat4.identity();
        this._translationMatrix = mat4.identity();
        this._scaleMatrix = mat4.identity();
        this.rotation = dragging => {
            const v1 = mat4.apply(this.inverseViewMatrix, toVector(dragging.startPos, this.canvas));
            const v2 = mat4.apply(this.inverseViewMatrix, toVector(dragging.pos, this.canvas));
            const rotation = mat4.crossProdRotation(vec3.swizzle(v1, 0, 1, 2), vec3.swizzle(v2, 0, 1, 2), this.speed);
            this._rotationMatrix = mat4.mul(rotation, this._startRotationMatrix);
            if (dragging.end) {
                this._startRotationMatrix = this._rotationMatrix;
            }
            return this._rotationMatrix;
        };
        this.translation = dragging => {
            const v1 = mat4.apply(this.inverseViewMatrix, toVector(dragging.startPos, this.canvas));
            const v2 = mat4.apply(this.inverseViewMatrix, toVector(dragging.pos, this.canvas));
            const translation = vec4.scale(vec4.sub(v2, v1), this.speed);
            this._translationMatrix = mat4.mul(mat4.translation(vec3.swizzle(translation, 0, 1, 2)), this._startTranslationMatrix);
            if (dragging.end) {
                this._startTranslationMatrix = this._translationMatrix;
            }
            return this._translationMatrix;
        };
        this.scale = dragging => {
            const v1 = mat4.apply(this.inverseViewMatrix, toVector(dragging.startPos, this.canvas));
            const v2 = mat4.apply(this.inverseViewMatrix, toVector(dragging.pos, this.canvas));
            const power = this.speed * (v2[1] - v1[1]);
            const scale = Math.pow(2, power);
            this._scaleMatrix = mat4.mul(mat4.scaling(scale, scale, scale), this._startScaleMatrix);
            if (dragging.end) {
                this._startScaleMatrix = this._scaleMatrix;
            }
            return this._scaleMatrix;
        };
        this.inverseViewMatrix = mat4.inverse(_viewMatrix);
    }
    get viewMatrix() {
        return this._viewMatrix;
    }
    set viewMatrix(m) {
        this._viewMatrix = m;
        this.inverseViewMatrix = mat4.inverse(m);
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
        return mat4.mul(this._translationMatrix, mat4.mul(this._rotationMatrix, this._scaleMatrix));
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
    return vec4.sub(vec4.mul([p[0], p[1], -1, 1], [2 / canvas.clientWidth, -2 / canvas.clientHeight, 1, 1]), [1, -1, 0, 0]);
}
//# sourceMappingURL=transformations.js.map