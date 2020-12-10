import { Matrix, vec } from '../space/all.js';
export function rotation(canvas, viewMatrix, speed = 8) {
    const matrix = [Matrix.identity()];
    const inverseViewMatrix = viewMatrix.inverse;
    return dragging => {
        const v1 = inverseViewMatrix.prod(toVector(dragging.startPos, canvas));
        const v2 = inverseViewMatrix.prod(toVector(dragging.pos, canvas));
        const rotation = Matrix.crossProdRotation(v1, v2, 0, speed);
        const result = rotation.by(matrix[0]);
        if (dragging.end) {
            matrix[0] = result;
        }
        return result;
    };
}
export function toVector(p, canvas) {
    return vec(p[0], p[1], -1, 1)
        .multiply(vec(2 / canvas.clientWidth, -2 / canvas.clientHeight, 1, 1))
        .minus(vec(1, -1, 0, 0));
}
//# sourceMappingURL=transformations.js.map