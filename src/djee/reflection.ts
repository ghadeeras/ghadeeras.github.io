import { failure } from "./utils.js"

export type PrimitiveType = 
    typeof WebGLRenderingContext.BOOL | 
    typeof WebGLRenderingContext.INT | 
    typeof WebGLRenderingContext.SAMPLER_2D | 
    typeof WebGLRenderingContext.SAMPLER_CUBE | 
    typeof WebGLRenderingContext.FLOAT

export type VariableInfo = {
    name: string,
    itemType: GLenum,
    itemCount: number,

    itemOrder: 0 | 1 | 2
    itemOrderName: "primitive" | "vector" | "matrix"
    itemDimensions: 1 | 2 | 3 | 4
    itemSize: number,
    itemSizeInBytes: number,

    primitiveType: PrimitiveType
    primitiveTypeName: "truth" | "discrete" | "scalar"
    primitiveSize: 1 | 2 | 4 | 8

    sizeInBytes: number
}

export type VariableInfos = Record<string, VariableInfo>

export function asVariableInfo(info: WebGLActiveInfo, specificPrimitiveType: GLenum | null = null): VariableInfo {
    const result: VariableInfo = {
        name: info.name,
        itemType: info.type,
        itemCount: info.size,

        itemOrder: order(info),
        itemOrderName: "primitive",
        itemDimensions: dimensions(info),
        itemSize: 0,
        itemSizeInBytes: 0,

        primitiveType: specificPrimitiveType ?? primitiveType(info),
        primitiveTypeName: "truth",
        primitiveSize: 4,

        sizeInBytes: 0
    }
    result.itemOrderName = orderName(result.itemOrder)
    result.itemSize = result.itemDimensions ** result.itemOrder
    result.itemSizeInBytes = result.itemSize * result.primitiveSize
    result.primitiveTypeName = primitiveTypeName(result.primitiveType)
    result.sizeInBytes = result.itemCount * result.itemSize * result.primitiveSize 
    return result
}

function orderName(order: 0 | 1 | 2): "primitive" | "vector" | "matrix" {
    switch (order) {
        case 0: return "primitive"
        case 1: return "vector"
        default: return "matrix"
    }
}

function primitiveTypeName(primitiveType: PrimitiveType): "truth" | "discrete" | "scalar" {
    switch (primitiveType) {
        case WebGLRenderingContext.BOOL: return "truth"
        case WebGLRenderingContext.INT: return "discrete"
        default: return "scalar"
    }
}

function dimensions(info: WebGLActiveInfo): 1 | 2 | 3 | 4 {
    const C = WebGLRenderingContext 
    switch (info.type) {
        case C.BOOL:
        case C.INT:
        case C.UNSIGNED_INT:
        case C.SHORT:
        case C.UNSIGNED_SHORT:
        case C.BYTE:
        case C.UNSIGNED_BYTE:
        case C.SAMPLER_2D:
        case C.SAMPLER_CUBE:
        case C.FLOAT: 
            return 1
        case C.BOOL_VEC2:
        case C.INT_VEC2:
        case C.FLOAT_VEC2:
        case C.FLOAT_MAT2: 
            return 2
        case C.BOOL_VEC3:
        case C.INT_VEC3:
        case C.FLOAT_VEC3:
        case C.FLOAT_MAT3:
            return 3
        case C.BOOL_VEC4:
        case C.INT_VEC4:
        case C.FLOAT_VEC4:
        case C.FLOAT_MAT4: 
            return 4
        default: 
            return failure(`Unsupported type:  ${info.type}`)
    }
}

function order(info: WebGLActiveInfo): 0 | 1 | 2 {
    const C = WebGLRenderingContext 
    switch (info.type) {
        case C.BOOL:
        case C.INT:
        case C.UNSIGNED_INT:
        case C.SHORT:
        case C.UNSIGNED_SHORT:
        case C.BYTE:
        case C.UNSIGNED_BYTE:
        case C.SAMPLER_2D:
        case C.SAMPLER_CUBE:
        case C.FLOAT: 
            return 0
        case C.BOOL_VEC2:
        case C.INT_VEC2:
        case C.FLOAT_VEC2:
        case C.BOOL_VEC3:
        case C.INT_VEC3:
        case C.FLOAT_VEC3:
        case C.BOOL_VEC4:
        case C.INT_VEC4:
        case C.FLOAT_VEC4: 
            return 1
        case C.FLOAT_MAT2:
        case C.FLOAT_MAT3:
        case C.FLOAT_MAT4: 
            return 2
        default: 
            return failure(`Unsupported type:  ${info.type}`)
    }
}

function primitiveType(info: WebGLActiveInfo): PrimitiveType {
    const C = WebGLRenderingContext 
    switch (info.type) {
        case C.BOOL:
        case C.INT:
        case C.UNSIGNED_INT:
        case C.SHORT:
        case C.UNSIGNED_SHORT:
        case C.BYTE:
        case C.UNSIGNED_BYTE:
        case C.FLOAT:
        case C.SAMPLER_2D:
        case C.SAMPLER_CUBE:
            return info.type
        case C.BOOL_VEC2:
        case C.BOOL_VEC3:
        case C.BOOL_VEC4: 
            return C.BOOL
        case C.INT_VEC2:
        case C.INT_VEC3:
        case C.INT_VEC4: 
            return C.INT
        case C.FLOAT_VEC2:
        case C.FLOAT_VEC3:
        case C.FLOAT_VEC4:
        case C.FLOAT_MAT2:
        case C.FLOAT_MAT3:
        case C.FLOAT_MAT4: 
            return C.FLOAT
        default: 
            return failure(`Unsupported type:  ${info.type}`)
    }
}
