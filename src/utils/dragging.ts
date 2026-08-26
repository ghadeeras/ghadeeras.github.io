import * as aether from "aether"
import * as gear from "gear"
import * as aetherx from "./aether.js"

export abstract class ModelMatrixDragging implements gear.loops.Dragger<aether.Mat<4>> {

    constructor(private projViewMatrix: gear.Supplier<aether.Mat<4>>, private speed: number = 1) {
    }

    begin(matrix: aether.Mat<4>, position: gear.loops.PointerPosition): gear.loops.DraggingFunction<aether.Mat<4>> {
        const translation = matrix[3]
        const rotation: aether.Mat4 = [
            matrix[0],
            matrix[1],
            matrix[2],
            [0, 0, 0, 1],
        ]
        const invProjViewMatrix = aether.mat4.inverse(this.projViewMatrix())
        const actualFrom = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...position, 1, 1]))
        return to => {
            const actualTo = aether.vec3.from(aether.mat4.apply(invProjViewMatrix, [...to, 1, 1]))
            const delta = this.delta(actualFrom, actualTo, this.speed)
            const newMatrix = aether.mat4.mul(delta, rotation)
            newMatrix[3][3] = 0
            return [
                newMatrix[0],
                newMatrix[1],
                newMatrix[2],
                aether.vec4.add(newMatrix[3], translation)
            ]
        };
    }

    end(matrix: aether.Mat<4>): aether.Mat<4> {
        return aether.mat4.orthogonal(matrix)
    }

    protected abstract delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number): aether.Mat<4>

}

export class RotationDragging extends ModelMatrixDragging {

    constructor(projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        super(projViewMatrix, speed)
    }

    protected delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number): aether.Mat<4> {
        return aether.mat4.crossProdRotation(actualFrom, actualTo, -speed)
    }

    static dragger(projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        return new RotationDragging(projViewMatrix, speed)
    }

}

export class TranslationDragging extends ModelMatrixDragging {

    constructor(projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        super(projViewMatrix, speed)
    }

    protected delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number) {
        return aether.mat4.translation(aether.vec3.scale(aether.vec3.sub(actualTo, actualFrom), speed))
    }

    static dragger(projViewMatrix: gear.Supplier<aether.Mat<4>>, speed: number = 1) {
        return new TranslationDragging(projViewMatrix, speed)
    }

}

export class ScaleDragging extends ModelMatrixDragging {

    constructor(speed: number = 1) {
        super(() => aether.mat4.identity(), speed)
    }

    protected delta(actualFrom: aether.Vec<3>, actualTo: aether.Vec<3>, speed: number) {
        const s = Math.pow(2, speed * (actualTo[1] - actualFrom[1]))
        return aether.mat4.scaling(s, s, s)
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

export class ZoomDragging implements gear.loops.Dragger<[aether.Mat<4>, aether.Mat<4>]> {

    constructor(private speed: number = 1) {
    }

    begin([projectionMat, viewMat]: [aether.Mat<4>, aether.Mat<4>], position: gear.loops.PointerPosition): gear.loops.DraggingFunction<[aether.Mat<4>, aether.Mat<4>]> {
        const [sx, sy] = [projectionMat[0][0], projectionMat[1][1]]
        const [focalLength, aspectRatio] = [Math.max(sx, sy), sy / sx]
        const toVec3: (v: aether.Vec2) => aether.Vec3 = aspectRatio > 1 
            ? v => [v[0] * aspectRatio, v[1], -focalLength] 
            : v => [v[0], v[1] / aspectRatio, -focalLength]
        const actualFrom = toVec3(position)
        return to => {
            const scale = Math.pow(2, this.speed * (to[1] - position[1]))
            const actualTo = toVec3(aether.vec2.scale(position , 1 / scale))
            const rotation = aether.mat4.crossProdRotation(actualFrom, actualTo)
            const scaling = aether.mat4.scaling(scale, scale, 1)
            return [
                aether.mat4.mul(projectionMat, scaling), 
                aether.mat4.mul(rotation, viewMat)
            ]
        };
    }

    end([projectionMat, viewMat]: [aether.Mat<4>, aether.Mat<4>]): [aether.Mat<4>, aether.Mat<4>] {
        return [projectionMat, aether.mat4.orthogonal(viewMat)];
    }

    static dragger(speed: number = 1) {
        return new ZoomDragging(speed)
    }

}
