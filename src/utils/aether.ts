import type { Mat4, Vec3 } from "aether"
import { mat3, mat4, mutVec3, vec3 } from "aether"

export type Range3D = [Vec3, Vec3]

export function centeringMatrix(range: Range3D): Mat4 {
    const [min, max] = range
    const scale = 2 / Math.max(...vec3.sub(max, min))
    const center = vec3.scale(vec3.add(min, max), -0.5 * scale)
    const matrix = mat4.affine(
        mat3.scaling(scale, scale, scale),
        center
    )
    return matrix
}

export function union(ranges: Range3D[]): Range3D {
    return ranges.reduce(
        ([min1, max1], [min2, max2]) => [mutVec3.min(min1, min2), mutVec3.max(max1, max2)], 
        [maxVecEver(), minVecEver()]
    )
}

export function isOpen(range: Range3D): boolean {
    const [min, max] = range;
    return [...min, ...max].some(c => Math.abs(c) == Number.MAX_VALUE);
}

export function minVecEver(): Vec3 {
    return [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
}

export function maxVecEver(): Vec3 {
    return [+Number.MAX_VALUE, +Number.MAX_VALUE, +Number.MAX_VALUE]
}

export function applyMatrixToRange(matrix: Mat4, range: Range3D): Range3D {
    if (isOpen(range)) {
        return [maxVecEver(), minVecEver()]
    }
    const vectors: Vec3[] = []
    for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
            for (let z = 0; z < 2; z++) {
                vectors.push(vec3.from(mat4.apply(
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
        vec3.minAll(maxVecEver(), ...vectors), 
        vec3.maxAll(minVecEver(), ...vectors)
    ]
}
