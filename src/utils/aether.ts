import * as aether from "aether"

export type Range3D = [aether.Vec3, aether.Vec3]

export function centeringMatrix(range: Range3D): aether.Mat4 {
    const [min, max] = range
    const scale = 2 / Math.max(...aether.vec3.sub(max, min))
    const center = aether.vec3.scale(aether.vec3.add(min, max), -0.5 * scale)
    const matrix = aether.mat4.affine(
        aether.mat3.scaling(scale, scale, scale),
        center
    )
    return matrix
}

export function union(ranges: Range3D[]): Range3D {
    return ranges.reduce(
        ([min1, max1], [min2, max2]) => [aether.mutVec3.min(min1, min2), aether.mutVec3.max(max1, max2)], 
        [maxVecEver(), minVecEver()]
    )
}

export function isOpen(range: Range3D): boolean {
    const [min, max] = range;
    return [...min, ...max].some(c => Math.abs(c) == Number.MAX_VALUE);
}

export function minVecEver(): aether.Vec3 {
    return [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
}

export function maxVecEver(): aether.Vec3 {
    return [+Number.MAX_VALUE, +Number.MAX_VALUE, +Number.MAX_VALUE]
}

export function applyMatrixToRange(matrix: aether.Mat4, range: Range3D): Range3D {
    if (isOpen(range)) {
        return [maxVecEver(), minVecEver()]
    }
    const vectors: aether.Vec3[] = []
    for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
            for (let z = 0; z < 2; z++) {
                vectors.push(aether.vec3.from(aether.mat4.apply(
                    matrix, 
                    [
                        range[x][0], 
                        range[y][1], 
                        range[z][2], 
                        1
                    ]
                )))
            }
        }
    }
    return [
        aether.vec3.minAll(maxVecEver(), ...vectors), 
        aether.vec3.maxAll(minVecEver(), ...vectors)
    ]
}
