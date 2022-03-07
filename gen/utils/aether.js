import { aether } from "../libs.js";
export function anti(matrix) {
    const inverse = aether.mat4.inverse(matrix);
    const antiMatrix = aether.mat4.transpose([inverse[0], inverse[1], inverse[2], [0, 0, 0, 1]]);
    return antiMatrix;
}
export function centeringMatrix(range) {
    const [min, max] = range;
    const scale = 2 / Math.max(...aether.vec3.sub(max, min));
    const center = aether.vec3.scale(aether.vec3.add(min, max), -0.5);
    const matrix = aether.mat4.mul(aether.mat4.scaling(scale, scale, scale), aether.mat4.translation(center));
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
//# sourceMappingURL=aether.js.map