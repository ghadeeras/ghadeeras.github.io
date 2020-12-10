import { Matrix, vec } from '../space/all.js';
import { Dragging, PointerPosition } from './ui-input.js';
import * as utils from './utils.js'

export function rotation(canvas: HTMLElement, viewMatrix: Matrix, speed: number = 8): utils.Mapper<Dragging, Matrix> {
    const matrix: Matrix[] = [Matrix.identity()]
    const inverseViewMatrix = viewMatrix.inverse
    return dragging => {
        const v1 = inverseViewMatrix.prod(toVector(dragging.startPos, canvas))
        const v2 = inverseViewMatrix.prod(toVector(dragging.pos, canvas))
        const rotation = Matrix.crossProdRotation(v1, v2, 0, speed)
        const result = rotation.by(matrix[0])
        if (dragging.end) {
            matrix[0] = result
        }
        return result
    }
}

export function toVector(p: PointerPosition, canvas: HTMLElement) {
    return vec(p[0], p[1], -1, 1)
        .multiply(vec(2 / canvas.clientWidth, -2 / canvas.clientHeight, 1, 1))
        .minus(vec(1, -1, 0, 0));
}
