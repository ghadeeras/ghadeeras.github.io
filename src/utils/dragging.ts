import type { Mat4, Vec2, Vec3 } from "aether"
import { mat4, vec2, vec3, vec4 } from "aether"
import * as gear from "gear"

export abstract class ModelMatrixDragging implements gear.loops.Dragger<Mat4> {

    constructor(private projViewMatrix: gear.Supplier<Mat4>, private speed: number = 1) {
    }

    begin(matrix: Mat4, position: gear.loops.PointerPosition): gear.loops.DraggingFunction<Mat4> {
        const translation = matrix[3]
        const rotation: Mat4 = [
            matrix[0],
            matrix[1],
            matrix[2],
            [0, 0, 0, 1],
        ]
        const invProjViewMatrix = mat4.inverse(this.projViewMatrix())
        const origin = vec3.from(mat4.apply(invProjViewMatrix, [0, 0, 0, 1]))
        const actualFrom = vec3.sub(vec3.from(mat4.apply(invProjViewMatrix, [...position, 1, 1])), origin)
        return to => {
            const actualTo = vec3.sub(vec3.from(mat4.apply(invProjViewMatrix, [...to, 1, 1])), origin)
            const delta = this.delta(actualFrom, actualTo, this.speed)
            const newMatrix = mat4.mul(delta, rotation)
            newMatrix[3][3] = 0
            return [
                newMatrix[0],
                newMatrix[1],
                newMatrix[2],
                vec4.add(newMatrix[3], translation)
            ]
        };
    }

    end(matrix: Mat4): Mat4 {
        return mat4.orthogonal(matrix, true)
    }

    protected abstract delta(actualFrom: Vec3, actualTo: Vec3, speed: number): Mat4

}

export class RotationDragging extends ModelMatrixDragging {

    constructor(projViewMatrix: gear.Supplier<Mat4>, speed: number = 1) {
        super(projViewMatrix, speed)
    }

    protected delta(actualFrom: Vec3, actualTo: Vec3, speed: number): Mat4 {
        return mat4.crossProdRotation(actualFrom, actualTo, speed)
    }

    static dragger(projViewMatrix: gear.Supplier<Mat4>, speed: number = 1) {
        return new RotationDragging(projViewMatrix, speed)
    }

}

export class TranslationDragging extends ModelMatrixDragging {

    constructor(projViewMatrix: gear.Supplier<Mat4>, speed: number = 1) {
        super(projViewMatrix, speed)
    }

    protected delta(actualFrom: Vec3, actualTo: Vec3, speed: number) {
        return mat4.translation(vec3.scale(vec3.sub(actualTo, actualFrom), speed))
    }

    static dragger(projViewMatrix: gear.Supplier<Mat4>, speed: number = 1) {
        return new TranslationDragging(projViewMatrix, speed)
    }

}

export class ScaleDragging extends ModelMatrixDragging {

    constructor(speed: number = 1) {
        super(() => mat4.identity(), speed)
    }

    protected delta(actualFrom: Vec3, actualTo: Vec3, speed: number) {
        const s = Math.pow(2, speed * (actualTo[1] - actualFrom[1]))
        return mat4.scaling(s, s, s)
    }

    static dragger(speed: number = 1) {
        return new ScaleDragging(speed)
    }

}

export class RatioDragging implements gear.loops.Dragger<number> {

    constructor(private min: number = Math.pow(2, -128), private max: number = Math.pow(2, 128), private speed: number = 1) {
    }

    begin(ratio: number, position: gear.loops.PointerPosition): gear.loops.DraggingFunction<number> {
        return to => clamp(ratio * Math.pow(2, this.speed * (to[1] - position[1])), this.min, this.max);
    }

    end(ratio: number): number {
        return ratio
    }

    static dragger(min: number = Math.pow(2, -128), max: number = Math.pow(2, 128), speed: number = 1) {
        return new RatioDragging(min, max, speed)
    }

}

export class LinearDragging implements gear.loops.Dragger<number> {

    constructor(private min: number = -1, private max: number = 1, private speed: number = 1) {
    }

    begin(value: number, position: gear.loops.PointerPosition): gear.loops.DraggingFunction<number> {
        return to => clamp(value + this.speed * (to[1] - position[1]), this.min, this.max);
    }

    end(value: number): number {
        return value
    }

    static dragger(min: number = -1, max: number = 1, speed: number = 1) {
        return new LinearDragging(min, max, speed)
    }

}

export class Linear2DDragging implements gear.loops.Dragger<Vec2> {

    private constructor(private min: Vec2, private max: Vec2, public speed: Vec2) {
    }

    begin(value: Vec2, position: gear.loops.PointerPosition): gear.loops.DraggingFunction<Vec2> {
        return to => vec2.clamp(
            vec2.add(value, vec2.mul(this.speed, vec2.sub(to, position))), 
        this.min, this.max);
    }

    end(value: Vec2): Vec2 {
        return value
    }

    static dragger(min: Vec2 = [-1, -1], max: Vec2 = [1, 1], speed: Vec2 = [1, 1]) {
        return new Linear2DDragging(min, max, speed)
    }

}

class PositionDragging implements gear.loops.Dragger<gear.loops.PointerPosition> {

    begin(): gear.loops.DraggingFunction<gear.loops.PointerPosition> {
        return to => [clamp(to[0], -1, 1), clamp(to[1], -1, 1)]
    }

    end(pos: gear.loops.PointerPosition): gear.loops.PointerPosition {
        return pos
    }

}

export const positionDragging = new PositionDragging()

function clamp(n: number, min: number, max: number) {
    return Math.min(Math.max(n, min), max)
}

export class ZoomDragging implements gear.loops.Dragger<[Mat4, Mat4]> {

    constructor(private speed: number = 1) {
    }

    begin([projectionMat, viewMat]: [Mat4, Mat4], position: gear.loops.PointerPosition): gear.loops.DraggingFunction<[Mat4, Mat4]> {
        const [sx, sy] = [projectionMat[0][0], projectionMat[1][1]]
        const [focalLength, aspectRatio] = [Math.max(sx, sy), sy / sx]
        const toVec3: (v: Vec2) => Vec3 = aspectRatio > 1 
            ? v => [v[0] * aspectRatio, v[1], -focalLength] 
            : v => [v[0], v[1] / aspectRatio, -focalLength]
        const actualFrom = toVec3(position)
        return to => {
            const scale = Math.pow(2, this.speed * (to[1] - position[1]))
            const actualTo = toVec3(vec2.scale(position , 1 / scale))
            const rotation = mat4.rotationBetween(actualFrom, actualTo)
            const scaling = mat4.scaling(scale, scale, 1)
            return [
                mat4.mul(projectionMat, scaling), 
                mat4.mul(rotation, viewMat)
            ]
        };
    }

    end([projectionMat, viewMat]: [Mat4, Mat4]): [Mat4, Mat4] {
        return [projectionMat, mat4.orthogonal(viewMat, true)];
    }

    static dragger(speed: number = 1) {
        return new ZoomDragging(speed)
    }

}
