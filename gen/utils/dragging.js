import * as ether from "../../ether/latest/index.js";
import * as gear from "../../gear/latest/index.js";
export class RotationDragging {
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
        const actualFrom = ether.mat4.apply(invProjViewMatrix, [...from, -1, 1]);
        return to => {
            const actualTo = ether.mat4.apply(invProjViewMatrix, [...to, -1, 1]);
            return ether.mat4.mul(ether.mat4.crossProdRotation(ether.vec3.swizzle(actualFrom, 0, 1, 2), ether.vec3.swizzle(actualTo, 0, 1, 2), this.speed), matrix);
        };
    }
    finalize(matrix) {
        const x = ether.vec4.unit(matrix[0]);
        const y = ether.vec4.unit(ether.vec4.subAll(matrix[1], ether.vec4.project(matrix[1], x)));
        const z = ether.vec4.unit(ether.vec4.subAll(matrix[2], ether.vec4.project(matrix[2], x), ether.vec4.project(matrix[2], y)));
        return [x, y, z, matrix[3]];
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