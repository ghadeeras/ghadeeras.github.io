import { ether, gear } from "/gen/libs.js";
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
        const invProjViewMatrix = ether.mat4.inverse(this.projViewMatrix());
        const actualFrom = ether.vec3.swizzle(ether.mat4.apply(invProjViewMatrix, [...from, -1, 1]), 0, 1, 2);
        const speed = this.speed * ether.vec3.length(actualFrom);
        return to => {
            const actualTo = ether.vec3.swizzle(ether.mat4.apply(invProjViewMatrix, [...to, -1, 1]), 0, 1, 2);
            const delta = this.delta(actualFrom, actualTo, speed);
            return ether.mat4.mul(delta, matrix);
        };
    }
    finalize(matrix) {
        const s = Math.pow(ether.mat4.determinant(matrix), (1 / 3));
        const x = ether.vec4.unit(matrix[0]);
        const y = ether.vec4.unit(ether.vec4.subAll(matrix[1], ether.vec4.project(matrix[1], x)));
        const z = ether.vec4.unit(ether.vec4.subAll(matrix[2], ether.vec4.project(matrix[2], x), ether.vec4.project(matrix[2], y)));
        return [
            ether.vec4.scale(x, s),
            ether.vec4.scale(y, s),
            ether.vec4.scale(z, s),
            matrix[3]
        ];
    }
}
export class RotationDragging extends ModelMatrixDragging {
    constructor(matrix, projViewMatrix, speed = 1) {
        super(matrix, projViewMatrix, speed);
    }
    delta(actualFrom, actualTo, speed) {
        return ether.mat4.crossProdRotation(actualFrom, actualTo, speed);
    }
}
export class TranslationDragging extends ModelMatrixDragging {
    constructor(matrix, projViewMatrix, speed = 1) {
        super(matrix, projViewMatrix, speed);
    }
    delta(actualFrom, actualTo, speed) {
        return ether.mat4.translation(ether.vec3.scale(ether.vec3.sub(actualTo, actualFrom), speed));
    }
}
export class ScaleDragging extends ModelMatrixDragging {
    constructor(matrix, speed = 1) {
        super(matrix, () => ether.mat4.identity(), speed);
    }
    delta(actualFrom, actualTo, speed) {
        const s = Math.pow(2, speed * (actualTo[1] - actualFrom[1]));
        return ether.mat4.scaling(s, s, s);
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
//# sourceMappingURL=dragging.js.map