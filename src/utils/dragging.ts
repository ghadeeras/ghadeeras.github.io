import * as ether from "../../ether/latest/index.js";
import * as gear from "../../gear/latest/index.js";

export class RotationDragging implements gear.DraggingHandler<ether.Mat<4>> {

    constructor(private matrix: gear.Supplier<ether.Mat<4>>, private projViewMatrix: gear.Supplier<ether.Mat<4>>, private speed: number = 1) {
    }

    currentValue(): ether.Mat<4> {
        return this.matrix();
    }

    mapper(matrix: ether.Mat<4>, from: gear.PointerPosition): gear.DraggingPositionMapper<ether.Mat<4>> {
        const invProjViewMatrix = ether.mat4.inverse(this.projViewMatrix())
        const actualFrom = ether.mat4.apply(invProjViewMatrix, [...from, -1, 1])
        return to => {
            const actualTo = ether.mat4.apply(invProjViewMatrix, [...to, -1, 1])
            return ether.mat4.mul(ether.mat4.crossProdRotation(
                ether.vec3.swizzle(actualFrom, 0, 1, 2), 
                ether.vec3.swizzle(actualTo, 0, 1, 2), 
                this.speed
            ), matrix)
        };
    }

    finalize(matrix: ether.Mat<4>): ether.Mat<4> {
        const x = ether.vec4.unit(matrix[0])
        const y = ether.vec4.unit(ether.vec4.subAll(matrix[1], ether.vec4.project(matrix[1], x)))
        const z = ether.vec4.unit(ether.vec4.subAll(matrix[2], ether.vec4.project(matrix[2], x), ether.vec4.project(matrix[2], y)))
        return [x, y, z, matrix[3]];
    }

}

export class RatioDragging implements gear.DraggingHandler<number> {

    constructor(private ratio: gear.Supplier<number>, private min: number = Math.pow(2, -128), private max: number = Math.pow(2, 128), private speed: number = 1) {
    }

    currentValue(): number {
        return this.ratio();
    }

    mapper(ratio: number, from: gear.PointerPosition): gear.DraggingPositionMapper<number> {
        return to => clamp(ratio * Math.pow(2, this.speed * (to[1] - from[1])), this.min, this.max);
    }

    finalize(ratio: number): number {
        return ratio;
    }

}

export class LinearDragging implements gear.DraggingHandler<number> {

    constructor(private value: gear.Supplier<number>, private min: number = -1, private max: number = 1, private speed: number = 1) {
    }

    currentValue(): number {
        return this.value();
    }

    mapper(value: number, from: gear.PointerPosition): gear.DraggingPositionMapper<number> {
        return to => clamp(value + this.speed * (to[1] - from[1]), this.min, this.max);
    }

    finalize(value: number): number {
        return value;
    }

}

class PositionDragging extends gear.SimpleDraggingHandler<gear.PointerPosition> {

    constructor() {
        super(to => [clamp(to[0], -1, 1), clamp(to[1], -1, 1)])
    }

}

export const positionDragging = new PositionDragging()

function clamp(n: number, min: number, max: number) {
    return Math.min(Math.max(n, min), max)
}