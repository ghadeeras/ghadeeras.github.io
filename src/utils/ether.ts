import { Mat, Vec } from "../../ether/latest/index.js"

export function asVec(array: number[] | Float32Array | Float64Array, offset: number = 0): Vec<4> {
    return [...array.slice(offset, offset + 4)] as Vec<4>
}

export function asMat(array: number[] | Float32Array | Float64Array, offset: number = 0): Mat<4> {
    return [
        asVec(array, offset +  0),
        asVec(array, offset +  4),
        asVec(array, offset +  8),
        asVec(array, offset + 12)
    ]
}
