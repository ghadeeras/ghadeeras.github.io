import * as aether from "aether";
import * as aetherx from "./aether.js";
export class ModelMatrixDragging {
    constructor(projViewMatrix, speed = 1) {
        this.projViewMatrix = projViewMatrix;
        this.speed = speed;
    }
    begin(matrix, position) {
        const translation = matrix[3];
        const rotation = [
            matrix[0],
            matrix[1],
            matrix[2],
            [0, 0, 0, 1],
        ];
        const invProjViewMatrix = aether.mat4.inverse(this.projViewMatrix());
        const actualFrom = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...position, 1, 1]));
        return to => {
            const actualTo = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...to, 1, 1]));
            const delta = this.delta(actualFrom, actualTo, this.speed);
            const newRotation = aether.mat4.mul(delta, rotation);
            return [
                newRotation[0],
                newRotation[1],
                newRotation[2],
                translation
            ];
        };
    }
    end(matrix) {
        return aetherx.orthogonal(matrix);
    }
}
export class RotationDragging extends ModelMatrixDragging {
    constructor(projViewMatrix, speed = 1) {
        super(projViewMatrix, speed);
    }
    delta(actualFrom, actualTo, speed) {
        return aether.mat4.crossProdRotation(actualFrom, actualTo, -speed);
    }
    static dragger(projViewMatrix, speed = 1) {
        return new RotationDragging(projViewMatrix, speed);
    }
}
export class TranslationDragging extends ModelMatrixDragging {
    constructor(projViewMatrix, speed = 1) {
        super(projViewMatrix, speed);
    }
    delta(actualFrom, actualTo, speed) {
        return aether.mat4.translation(aether.vec3.scale(aether.vec3.sub(actualTo, actualFrom), speed));
    }
    static dragger(projViewMatrix, speed = 1) {
        return new TranslationDragging(projViewMatrix, speed);
    }
}
export class ScaleDragging extends ModelMatrixDragging {
    constructor(speed = 1) {
        super(() => aether.mat4.identity(), speed);
    }
    delta(actualFrom, actualTo, speed) {
        const s = Math.pow(2, speed * (actualTo[1] - actualFrom[1]));
        return aether.mat4.scaling(s, s, s);
    }
    static dragger(speed = 1) {
        return new ScaleDragging(speed);
    }
}
export class RatioDragging {
    constructor(min = Math.pow(2, -128), max = Math.pow(2, 128), speed = 1) {
        this.min = min;
        this.max = max;
        this.speed = speed;
    }
    begin(ratio, position) {
        return to => clamp(ratio * Math.pow(2, this.speed * (to[1] - position[1])), this.min, this.max);
    }
    end(ratio) {
        return ratio;
    }
    static dragger(min = Math.pow(2, -128), max = Math.pow(2, 128), speed = 1) {
        return new RatioDragging(min, max, speed);
    }
}
export class LinearDragging {
    constructor(min = -1, max = 1, speed = 1) {
        this.min = min;
        this.max = max;
        this.speed = speed;
    }
    begin(value, position) {
        return to => clamp(value + this.speed * (to[1] - position[1]), this.min, this.max);
    }
    end(value) {
        return value;
    }
    static dragger(min = -1, max = 1, speed = 1) {
        return new LinearDragging(min, max, speed);
    }
}
class PositionDragging {
    begin() {
        return to => [clamp(to[0], -1, 1), clamp(to[1], -1, 1)];
    }
    end(pos) {
        return pos;
    }
}
export const positionDragging = new PositionDragging();
function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}
export class ZoomDragging {
    constructor(speed = 1) {
        this.speed = speed;
    }
    begin([projectionMat, viewMat], position) {
        const [sx, sy] = [projectionMat[0][0], projectionMat[1][1]];
        const [focalLength, aspectRatio] = [Math.max(sx, sy), sy / sx];
        const toVec3 = aspectRatio > 1
            ? v => [v[0] * aspectRatio, v[1], -focalLength]
            : v => [v[0], v[1] / aspectRatio, -focalLength];
        const actualFrom = toVec3(position);
        return to => {
            const scale = Math.pow(2, this.speed * (to[1] - position[1]));
            const actualTo = toVec3(aether.vec2.scale(position, 1 / scale));
            const rotation = aether.mat4.crossProdRotation(actualFrom, actualTo);
            const scaling = aether.mat4.scaling(scale, scale, 1);
            return [
                aether.mat4.mul(projectionMat, scaling),
                aether.mat4.mul(rotation, viewMat)
            ];
        };
    }
    end([projectionMat, viewMat]) {
        return [projectionMat, aetherx.orthogonal(viewMat)];
    }
    static dragger(speed = 1) {
        return new ZoomDragging(speed);
    }
}
//# sourceMappingURL=dragging.js.map