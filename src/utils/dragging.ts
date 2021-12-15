import * as ether from "ether";
import * as gear from "gear";

export abstract class ModelMatrixDragging implements gear.DraggingHandler<ether.Mat<4>> {

    constructor(private matrix: gear.Supplier<ether.Mat<4>>, private projViewMatrix: gear.Supplier<ether.Mat<4>>, private speed: number = 1) {
    }

    currentValue(): ether.Mat<4> {
        return this.matrix();
    }

    mapper(matrix: ether.Mat<4>, from: gear.PointerPosition): gear.DraggingPositionMapper<ether.Mat<4>> {
        const invProjViewMatrix = ether.mat4.inverse(this.projViewMatrix())
        const actualFrom = ether.vec3.swizzle(ether.mat4.apply(invProjViewMatrix, [...from, -1, 1]), 0, 1, 2)
        const speed = this.speed * ether.vec3.length(actualFrom)
        return to => {
            const actualTo = ether.vec3.swizzle(ether.mat4.apply(invProjViewMatrix, [...to, -1, 1]), 0, 1, 2)
            const delta = this.delta(actualFrom, actualTo, speed)
            return ether.mat4.mul(delta, matrix)
        };
    }

    protected abstract delta(actualFrom: ether.Vec<3>, actualTo: ether.Vec<3>, speed: number): ether.Mat<4>

    finalize(matrix: ether.Mat<4>): ether.Mat<4> {
        const s = ether.mat4.determinant(matrix) ** (1 / 3)
        const x = ether.vec4.unit(matrix[0])
        const y = ether.vec4.unit(ether.vec4.subAll(matrix[1], ether.vec4.project(matrix[1], x)))
        const z = ether.vec4.unit(ether.vec4.subAll(matrix[2], ether.vec4.project(matrix[2], x), ether.vec4.project(matrix[2], y)))
        return [
            ether.vec4.scale(x, s), 
            ether.vec4.scale(y, s), 
            ether.vec4.scale(z, s), 
            matrix[3]
        ];
    }

}

export class RotationDragging extends ModelMatrixDragging {

    constructor(matrix: gear.Supplier<ether.Mat<4>>, projViewMatrix: gear.Supplier<ether.Mat<4>>, speed: number = 1) {
        super(matrix, projViewMatrix, speed)
    }

    protected delta(actualFrom: ether.Vec<3>, actualTo: ether.Vec<3>, speed: number): ether.Mat<4> {
        return ether.mat4.crossProdRotation(actualFrom, actualTo, speed)
    }

}

export class TranslationDragging extends ModelMatrixDragging {

    constructor(matrix: gear.Supplier<ether.Mat<4>>, projViewMatrix: gear.Supplier<ether.Mat<4>>, speed: number = 1) {
        super(matrix, projViewMatrix, speed)
    }

    protected delta(actualFrom: ether.Vec<3>, actualTo: ether.Vec<3>, speed: number) {
        return ether.mat4.translation(ether.vec3.scale(ether.vec3.sub(actualTo, actualFrom), speed))
    }

}

export class ScaleDragging extends ModelMatrixDragging {

    constructor(matrix: gear.Supplier<ether.Mat<4>>, speed: number = 1) {
        super(matrix, () => ether.mat4.identity(), speed)
    }

    protected delta(actualFrom: ether.Vec<3>, actualTo: ether.Vec<3>, speed: number) {
        const s = Math.pow(2, speed * (actualTo[1] - actualFrom[1]))
        return ether.mat4.scaling(s, s, s)
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