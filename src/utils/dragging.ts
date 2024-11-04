import { aether, gear } from "/gen/libs.js";
import * as aetherx from "./aether.js"

export abstract class ModelMatrixDragging implements gear.DraggingHandler<aether.Mat<4>>, gear.loops.Dragger<aether.Mat<4>> {

    constructor(private matrix: gear.Supplier<aether.Mat<4>>, private projViewMatrix: gear.Supplier<aether.Mat<4>>, private speed: number = 1) {
    }

    begin(matrix: aether.Mat<4>, position: gear.PointerPosition): gear.loops.DraggingFunction<aether.Mat<4>> {
        return this.mapper(matrix, position)
    }

    end(matrix: aether.Mat<4>): aether.Mat<4> {
        return this.finalize(matrix)
    }

    currentValue(): aether.Mat<4> {
        return this.matrix();
    }

    mapper(matrix: aether.Mat<4>, from: gear.PointerPosition): gear.DraggingPositionMapper<aether.Mat<4>> {
        const invProjViewMatrix = aether.mat4.inverse(this.projViewMatrix())
        const actualFrom = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...from, 1, 1]))
        const speed = this.speed * aether.vec3.length(actualFrom)
        return to => {
            const actualTo = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...to, 1, 1]))
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
        return aetherx.orthogonal(matrix)
    }

}

export class RotationDragging extends ModelMatrixDragging {

    constructor(matrix: gear.Supplier<aether.Mat<4>>, projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        super(matrix, projViewMatrix, speed)
    }

    protected delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number): aether.Mat<4> {
        return aether.mat4.crossProdRotation(actualFrom, actualTo, -speed)
    }

    static dragger(projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        return new RotationDragging(supplyNothing, projViewMatrix, speed)
    }

}

export class TranslationDragging extends ModelMatrixDragging {

    constructor(matrix: gear.Supplier<aether.Mat<4>>, projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        super(matrix, projViewMatrix, speed)
    }

    protected delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number) {
        return aether.mat4.translation(aether.vec3.scale(aether.vec3.sub(actualTo, actualFrom), speed))
    }

    static dragger(projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        return new TranslationDragging(supplyNothing, projViewMatrix, speed)
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

    static dragger(speed: number = 1) {
        return new ScaleDragging(supplyNothing, speed)
    }

}

export class RatioDragging implements gear.DraggingHandler<number>, gear.loops.Dragger<number> {

    constructor(private ratio: gear.Supplier<number>, private min: number = Math.pow(2, -128), private max: number = Math.pow(2, 128), private speed: number = 1) {
    }

    begin(ratio: number, position: gear.PointerPosition): gear.loops.DraggingFunction<number> {
        return this.mapper(ratio, position)
    }

    end(ratio: number): number {
        return ratio
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

    static dragger(min: number = Math.pow(2, -128), max: number = Math.pow(2, 128), speed: number = 1) {
        return new RatioDragging(supplyNothing, min, max, speed)
    }

}

export class LinearDragging implements gear.DraggingHandler<number>, gear.loops.Dragger<number> {

    constructor(private value: gear.Supplier<number>, private min: number = -1, private max: number = 1, private speed: number = 1) {
    }

    begin(value: number, position: gear.PointerPosition): gear.loops.DraggingFunction<number> {
        return this.mapper(value, position)
    }

    end(value: number): number {
        return value
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

    static dragger(min: number = -1, max: number = 1, speed: number = 1) {
        return new LinearDragging(supplyNothing, min, max, speed)
    }

}

class PositionDragging extends gear.SimpleDraggingHandler<gear.PointerPosition> implements gear.loops.Dragger<gear.PointerPosition> {

    constructor() {
        super(to => [clamp(to[0], -1, 1), clamp(to[1], -1, 1)])
    }

    begin(pos: gear.PointerPosition, position: gear.PointerPosition): gear.loops.DraggingFunction<gear.PointerPosition> {
        return this.mapper(pos, position, false, false, false)
    }

    end(pos: gear.PointerPosition): gear.PointerPosition {
        return this.finalize(pos)
    }

}

export const positionDragging = new PositionDragging()

function clamp(n: number, min: number, max: number) {
    return Math.min(Math.max(n, min), max)
}

export class ZoomDragging implements gear.DraggingHandler<[aether.Mat<4>, aether.Mat<4>]>, gear.loops.Dragger<[aether.Mat<4>, aether.Mat<4>]> {

    constructor(private projectViewMatrices: gear.Supplier<[aether.Mat<4>, aether.Mat<4>]>, private speed: number = 1) {
    }

    begin(projectViewMatrices: [aether.Mat<4>, aether.Mat<4>], position: gear.PointerPosition): gear.loops.DraggingFunction<[aether.Mat<4>, aether.Mat<4>]> {
        return this.mapper(projectViewMatrices, position)
    }

    end(projectViewMatrices: [aether.Mat<4>, aether.Mat<4>]): [aether.Mat<4>, aether.Mat<4>] {
        return this.finalize(projectViewMatrices)
    }

    currentValue(): [aether.Mat<4>, aether.Mat<4>] {
        return this.projectViewMatrices();
    }

    mapper([projectionMat, viewMat]: [aether.Mat<4>, aether.Mat<4>], from: gear.PointerPosition): gear.DraggingPositionMapper<[aether.Mat<4>, aether.Mat<4>]> {
        const [sx, sy] = [projectionMat[0][0], projectionMat[1][1]]
        const [focalLength, aspectRatio] = [Math.max(sx, sy), sy / sx]
        const toVec3: (v: aether.Vec2) => aether.Vec3 = aspectRatio > 1 
            ? v => [v[0] * aspectRatio, v[1], -focalLength] 
            : v => [v[0], v[1] / aspectRatio, -focalLength]
        const actualFrom = toVec3(from)
        return to => {
            const scale = Math.pow(2, this.speed * (to[1] - from[1]))
            const actualTo = toVec3(aether.vec2.scale(from , 1 / scale))
            const rotation = aether.mat4.crossProdRotation(actualFrom, actualTo)
            const scaling = aether.mat4.scaling(scale, scale, 1)
            return [
                aether.mat4.mul(projectionMat, scaling), 
                aether.mat4.mul(rotation, viewMat)
            ]
        };
    }

    finalize([projectionMat, viewMat]: [aether.Mat<4>, aether.Mat<4>]): [aether.Mat<4>, aether.Mat<4>] {
        return [projectionMat, aetherx.orthogonal(viewMat)];
    }

    static dragger(speed: number = 1) {
        return new ZoomDragging(supplyNothing, speed)
    }
}

function supplyNothing<T>(): T {
    throw new Error("Unsupported!")
}