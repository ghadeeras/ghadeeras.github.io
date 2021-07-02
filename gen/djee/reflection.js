import { failure } from "./utils.js";
export function asVariableInfo(info) {
    const result = {
        name: info.name,
        itemType: info.type,
        itemCount: info.size,
        itemOrder: order(info),
        itemOrderName: "primitive",
        itemDimensions: dimensions(info),
        itemSize: 0,
        itemSizeInBytes: 0,
        primitiveType: primitiveType(info),
        primitiveTypeName: "truth",
        primitiveSize: 4,
        sizeInBytes: 0
    };
    result.itemOrderName = orderName(result.itemOrder);
    result.itemSize = result.itemDimensions ** result.itemOrder;
    result.itemSizeInBytes = result.itemSize * result.primitiveSize;
    result.primitiveTypeName = primitiveTypeName(result.primitiveType);
    result.sizeInBytes = result.itemCount * result.itemSize * result.primitiveSize;
    return result;
}
function orderName(order) {
    switch (order) {
        case 0: return "primitive";
        case 1: return "vector";
        default: return "matrix";
    }
}
function primitiveTypeName(primitiveType) {
    switch (primitiveType) {
        case WebGLRenderingContext.BOOL: return "truth";
        case WebGLRenderingContext.INT: return "discrete";
        default: return "scalar";
    }
}
function dimensions(info) {
    const C = WebGLRenderingContext;
    switch (info.type) {
        case C.BOOL:
        case C.INT:
        case C.SAMPLER_2D:
        case C.SAMPLER_CUBE:
        case C.FLOAT:
            return 1;
        case C.BOOL_VEC2:
        case C.INT_VEC2:
        case C.FLOAT_VEC2:
        case C.FLOAT_MAT2:
            return 2;
        case C.BOOL_VEC3:
        case C.INT_VEC3:
        case C.FLOAT_VEC3:
        case C.FLOAT_MAT3:
            return 3;
        case C.BOOL_VEC4:
        case C.INT_VEC4:
        case C.FLOAT_VEC4:
        case C.FLOAT_MAT4:
            return 4;
        default:
            return failure(`Unsupported type:  ${info.type}`);
    }
}
function order(info) {
    const C = WebGLRenderingContext;
    switch (info.type) {
        case C.BOOL:
        case C.INT:
        case C.SAMPLER_2D:
        case C.SAMPLER_CUBE:
        case C.FLOAT:
            return 0;
        case C.BOOL_VEC2:
        case C.INT_VEC2:
        case C.FLOAT_VEC2:
        case C.BOOL_VEC3:
        case C.INT_VEC3:
        case C.FLOAT_VEC3:
        case C.BOOL_VEC4:
        case C.INT_VEC4:
        case C.FLOAT_VEC4:
            return 1;
        case C.FLOAT_MAT2:
        case C.FLOAT_MAT3:
        case C.FLOAT_MAT4:
            return 2;
        default:
            return failure(`Unsupported type:  ${info.type}`);
    }
}
function primitiveType(info) {
    const C = WebGLRenderingContext;
    switch (info.type) {
        case C.BOOL:
        case C.BOOL_VEC2:
        case C.BOOL_VEC3:
        case C.BOOL_VEC4:
            return WebGLRenderingContext.BOOL;
        case C.INT:
        case C.INT_VEC2:
        case C.INT_VEC3:
        case C.INT_VEC4:
            return WebGLRenderingContext.INT;
        case C.SAMPLER_2D:
            return WebGLRenderingContext.SAMPLER_2D;
        case C.SAMPLER_CUBE:
            return WebGLRenderingContext.SAMPLER_CUBE;
        case C.FLOAT:
        case C.FLOAT_VEC2:
        case C.FLOAT_VEC3:
        case C.FLOAT_VEC4:
        case C.FLOAT_MAT2:
        case C.FLOAT_MAT3:
        case C.FLOAT_MAT4:
            return WebGLRenderingContext.FLOAT;
        default:
            return failure(`Unsupported type:  ${info.type}`);
    }
}
//# sourceMappingURL=reflection.js.map