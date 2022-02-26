import { aether, gear } from "/gen/libs.js";

export abstract class ModelMatrixDragging implements gear.DraggingHandler<aether.Mat<4>> {

    constructor(private matrix: gear.Supplier<aether.Mat<4>>, private projViewMatrix: gear.Supplier<aether.Mat<4>>, private speed: number = 1) {
    }

    currentValue(): aether.Mat<4> {
        return this.matrix();
    }

    mapper(matrix: aether.Mat<4>, from: gear.PointerPosition): gear.DraggingPositionMapper<aether.Mat<4>> {
        const invProjViewMatrix = aether.mat4.inverse(this.projViewMatrix())
        const actualFrom = aether.vec3.swizzle(aether.mat4.apply(invProjViewMatrix, [...from, -1, 1]), 0, 1, 2)
        const speed = this.speed * aether.vec3.length(actualFrom)
        return to => {
            const actualTo = aether.vec3.swizzle(aether.mat4.apply(invProjViewMatrix, [...to, -1, 1]), 0, 1, 2)
            const delta = this.delta(actualFrom, actualTo, speed)
            const translation = aether.mat4.translation(aether.vec3.from(matrix[3]))
            const rotation: aether.Mat4 = [
                matrix[0],
                matrix[1],
                matrix[2],
                [0, 0, 0, 1],
            ]
            return aether.mat4.mul(translation, aether.mat4.mul(delta, rotation))
        };
    }

    protected abstract delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number): aether.Mat<4>

    finalize(matrix: aether.Mat<4>): aether.Mat<4> {
        const s = aether.mat4.determinant(matrix) ** (1 / 3)
        const x = aether.vec4.unit(matrix[0])
        const y = aether.vec4.unit(aether.vec4.subAll(matrix[1], aether.vec4.project(matrix[1], x)))
        const z = aether.vec4.unit(aether.vec4.subAll(matrix[2], aether.vec4.project(matrix[2], x), aether.vec4.project(matrix[2], y)))
        return [
            aether.vec4.scale(x, s), 
            aether.vec4.scale(y, s), 
            aether.vec4.scale(z, s), 
            matrix[3]
        ];
    }

}

export class RotationDragging extends ModelMatrixDragging {

    constructor(matrix: gear.Supplier<aether.Mat<4>>, projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        super(matrix, projViewMatrix, speed)
    }

    protected delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number): aether.Mat<4> {
        return aether.mat4.crossProdRotation(actualFrom, actualTo, speed)
    }

}

export class TranslationDragging extends ModelMatrixDragging {

    constructor(matrix: gear.Supplier<aether.Mat<4>>, projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        super(matrix, projViewMatrix, speed)
    }

    protected delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number) {
        return aether.mat4.translation(aether.vec3.scale(aether.vec3.sub(actualTo, actualFrom), speed))
    }

}

export class ScaleDragging extends ModelMatrixDragging {

    constructor(matrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        super(matrix, () => aether.mat4.identity(), speed)
    }

    protected delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number) {
        const s = Math.pow(2, speed * (actualTo[1] - actualFrom[1]))
        return aether.mat4.scaling(s, s, s)
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