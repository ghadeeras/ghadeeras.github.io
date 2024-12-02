import { aether } from "../libs.js";
export function anti(matrix) {
    const inverse = aether.mat4.inverse(matrix);
    inverse[3] = [0, 0, 0, 1];
    const antiMatrix = aether.mat4.transpose(inverse);
    return antiMatrix;
}
export function centeringMatrix(range) {
    const [min, max] = range;
    const scale = 2 / Math.max(...aether.vec3.sub(max, min));
    const center = aether.vec3.scale(aether.vec3.add(min, max), -0.5 * scale);
    const matrix = aether.mat4.affine(aether.mat3.scaling(scale, scale, scale), center);
    return matrix;
}
export function union(ranges) {
    return ranges.reduce(([min1, max1], [min2, max2]) => [aether.mutVec3.min(min1, min2), aether.mutVec3.max(max1, max2)], [maxVecEver(), minVecEver()]);
}
export function isOpen(range) {
    const [min, max] = range;
    return [...min, ...max].some(c => Math.abs(c) == Number.MAX_VALUE);
}
export function minVecEver() {
    return [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
}
export function maxVecEver() {
    return [+Number.MAX_VALUE, +Number.MAX_VALUE, +Number.MAX_VALUE];
}
export function isIdentityMatrix(matrix) {
    for (let i = 0; i < 4; i++) {
        for (let j = i; j < 4; j++) {
            if (i === j) {
                if (matrix[i][j] !== 1) {
                    return false;
                }
            }
            else {
                if (matrix[i][j] !== 0 || matrix[j][i] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}
export function applyMatrixToRange(matrix, range) {
    if (isOpen(range)) {
        return [maxVecEver(), minVecEver()];
    }
    const vectors = [];
    for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
            for (let z = 0; z < 2; z++) {
                vectors.push(aether.vec3.from(aether.mat4.apply(matrix, [
                    range[x][0],
                    range[y][1],
                    range[z][2],
                    1
                ])));
            }
        }
    }
    return [
        aether.vec3.minAll(maxVecEver(), ...vectors),
        aether.vec3.maxAll(minVecEver(), ...vectors)
    ];
}
export function orthogonal(matrix, keepScale = true) {
    const s = keepScale ? aether.mat4.determinant(matrix) ** (1 / 3) : 1;
    const x = aether.vec4.setLength(matrix[0], s);
    const y = aether.vec4.setLength(aether.vec4.subAll(matrix[1], aether.vec4.project(matrix[1], x)), s);
    const z = aether.vec4.setLength(aether.vec4.subAll(matrix[2], aether.vec4.project(matrix[2], x), aether.vec4.project(matrix[2], y)), s);
    return [x, y, z, matrix[3]];
}
//# sourceMappingURL=aether.js.map