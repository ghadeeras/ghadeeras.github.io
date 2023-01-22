import { aether, gear } from "/gen/libs.js";
import * as aetherx from "./aether.js";
export class ModelMatrixDragging {
    constructor(matrix, projViewMatrix, speed = 1) {
        this.matrix = matrix;
        this.projViewMatrix = projViewMatrix;
        this.speed = speed;
    }
    currentValue() {
        return this.matrix();
    }
    mapper(matrix, from) {
        const invProjViewMatrix = aether.mat4.inverse(this.projViewMatrix());
        const actualFrom = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...from, -1, 1]));
        const speed = this.speed * aether.vec3.length(actualFrom);
        return to => {
            const actualTo = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...to, -1, 1]));
            const delta = this.delta(actualFrom, actualTo, speed);
            const translation = aether.mat4.translation(aether.vec3.from(matrix[3]));
            const rotation = [
                matrix[0],
                matrix[1],
                matrix[2],
                [0, 0, 0, 1],
            ];
            return aether.mat4.mul(translation, aether.mat4.mul(delta, rotation));
        };
    }
    finalize(matrix) {
        const s = Math.pow(aether.mat4.determinant(matrix), (1 / 3));
        const [x, y, z, w] = aetherx.orthogonal(matrix);
        return [
            aether.vec4.scale(x, s),
            aether.vec4.scale(y, s),
            aether.vec4.scale(z, s),
            w
        ];
    }
}
export class RotationDragging extends ModelMatrixDragging {
    constructor(matrix, projViewMatrix, speed = 1) {
        super(matrix, projViewMatrix, speed);
    }
    delta(actualFrom, actualTo, speed) {
        return aether.mat4.crossProdRotation(actualFrom, actualTo, speed);
    }
}
export class TranslationDragging extends ModelMatrixDragging {
    constructor(matrix, projViewMatrix, speed = 1) {
        super(matrix, projViewMatrix, speed);
    }
    delta(actualFrom, actualTo, speed) {
        return aether.mat4.translation(aether.vec3.scale(aether.vec3.sub(actualTo, actualFrom), speed));
    }
}
export class ScaleDragging extends ModelMatrixDragging {
    constructor(matrix, speed = 1) {
        super(matrix, () => aether.mat4.identity(), speed);
    }
    delta(actualFrom, actualTo, speed) {
        const s = Math.pow(2, speed * (actualTo[1] - actualFrom[1]));
        return aether.mat4.scaling(s, s, s);
    }
}
export class RatioDragging {
    constructor(ratio, min = Math.pow(2, -128), max = Math.pow(2, 128), speed = 1) {
        this.ratio = ratio;
        this.min = min;
        this.max = max;
        this.speed = speed;
    }
    currentValue() {
        return this.ratio();
    }
    mapper(ratio, from) {
        return to => clamp(ratio * Math.pow(2, this.speed * (to[1] - from[1])), this.min, this.max);
    }
    finalize(ratio) {
        return ratio;
    }
}
export class LinearDragging {
    constructor(value, min = -1, max = 1, speed = 1) {
        this.value = value;
        this.min = min;
        this.max = max;
        this.speed = speed;
    }
    currentValue() {
        return this.value();
    }
    mapper(value, from) {
        return to => clamp(value + this.speed * (to[1] - from[1]), this.min, this.max);
    }
    finalize(value) {
        return value;
    }
}
class PositionDragging extends gear.SimpleDraggingHandler {
    constructor() {
        super(to => [clamp(to[0], -1, 1), clamp(to[1], -1, 1)]);
    }
}
export const positionDragging = new PositionDragging();
function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}
export class ZoomDragging {
    constructor(projectViewMatrices, speed = 1) {
        this.projectViewMatrices = projectViewMatrices;
        this.speed = speed;
    }
    currentValue() {
        return this.projectViewMatrices();
    }
    mapper([projectionMat, viewMat], from) {
        const [sx, sy] = [projectionMat[0][0], projectionMat[1][1]];
        const [focalLength, aspectRatio] = [Math.max(sx, sy), sy / sx];
        const toVec3 = aspectRatio > 1
            ? v => [v[0] * aspectRatio, v[1], -focalLength]
            : v => [v[0], v[1] / aspectRatio, -focalLength];
        const actualFrom = toVec3(from);
        return to => {
            const scale = Math.pow(2, this.speed * (to[1] - from[1]));
            const actualTo = toVec3(aether.vec2.scale(from, 1 / scale));
            const rotation = aether.mat4.crossProdRotation(actualFrom, actualTo);
            const scaling = aether.mat4.scaling(scale, scale, 1);
            return [
                aether.mat4.mul(projectionMat, scaling),
                aether.mat4.mul(rotation, viewMat)
            ];
        };
    }
    finalize([projectionMat, viewMat]) {
        return [projectionMat, aetherx.orthogonal(viewMat)];
    }
}
//# sourceMappingURL=dragging.js.map