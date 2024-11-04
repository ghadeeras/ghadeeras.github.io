import { aether, gear } from "/gen/libs.js";
import * as aetherx from "./aether.js";
export class ModelMatrixDragging {
    constructor(matrix, projViewMatrix, speed = 1) {
        this.matrix = matrix;
        this.projViewMatrix = projViewMatrix;
        this.speed = speed;
    }
    begin(matrix, position) {
        return this.mapper(matrix, position);
    }
    end(matrix) {
        return this.finalize(matrix);
    }
    currentValue() {
        return this.matrix();
    }
    mapper(matrix, from) {
        const invProjViewMatrix = aether.mat4.inverse(this.projViewMatrix());
        const actualFrom = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...from, 1, 1]));
        const speed = this.speed * aether.vec3.length(actualFrom);
        return to => {
            const actualTo = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...to, 1, 1]));
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
        return aetherx.orthogonal(matrix);
    }
}
export class RotationDragging extends ModelMatrixDragging {
    constructor(matrix, projViewMatrix, speed = 1) {
        super(matrix, projViewMatrix, speed);
    }
    delta(actualFrom, actualTo, speed) {
        return aether.mat4.crossProdRotation(actualFrom, actualTo, -speed);
    }
    static dragger(projViewMatrix, speed = 1) {
        return new RotationDragging(supplyNothing, projViewMatrix, speed);
    }
}
export class TranslationDragging extends ModelMatrixDragging {
    constructor(matrix, projViewMatrix, speed = 1) {
        super(matrix, projViewMatrix, speed);
    }
    delta(actualFrom, actualTo, speed) {
        return aether.mat4.translation(aether.vec3.scale(aether.vec3.sub(actualTo, actualFrom), speed));
    }
    static dragger(projViewMatrix, speed = 1) {
        return new TranslationDragging(supplyNothing, projViewMatrix, speed);
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
    static dragger(speed = 1) {
        return new ScaleDragging(supplyNothing, speed);
    }
}
export class RatioDragging {
    constructor(ratio, min = Math.pow(2, -128), max = Math.pow(2, 128), speed = 1) {
        this.ratio = ratio;
        this.min = min;
        this.max = max;
        this.speed = speed;
    }
    begin(ratio, position) {
        return this.mapper(ratio, position);
    }
    end(ratio) {
        return ratio;
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
    static dragger(min = Math.pow(2, -128), max = Math.pow(2, 128), speed = 1) {
        return new RatioDragging(supplyNothing, min, max, speed);
    }
}
export class LinearDragging {
    constructor(value, min = -1, max = 1, speed = 1) {
        this.value = value;
        this.min = min;
        this.max = max;
        this.speed = speed;
    }
    begin(value, position) {
        return this.mapper(value, position);
    }
    end(value) {
        return value;
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
    static dragger(min = -1, max = 1, speed = 1) {
        return new LinearDragging(supplyNothing, min, max, speed);
    }
}
class PositionDragging extends gear.SimpleDraggingHandler {
    constructor() {
        super(to => [clamp(to[0], -1, 1), clamp(to[1], -1, 1)]);
    }
    begin(pos, position) {
        return this.mapper(pos, position, false, false, false);
    }
    end(pos) {
        return this.finalize(pos);
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
    begin(projectViewMatrices, position) {
        return this.mapper(projectViewMatrices, position);
    }
    end(projectViewMatrices) {
        return this.finalize(projectViewMatrices);
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
    static dragger(speed = 1) {
        return new ZoomDragging(supplyNothing, speed);
    }
}
function supplyNothing() {
    throw new Error("Unsupported!");
}
//# sourceMappingURL=dragging.js.map