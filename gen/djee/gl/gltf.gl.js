import { aether } from "/gen/libs.js";
import { AttributesBuffer } from "./buffer.js";
import { asVariableInfo } from "./introspection.js";
import { failure } from "../utils.js";
export class GLRenderer {
    constructor(context, attributes, positionsMatUniform, normalsMatUniform) {
        this.context = context;
        this.attributes = attributes;
        this.positionsMatUniform = positionsMatUniform;
        this.normalsMatUniform = normalsMatUniform;
    }
    newIndicesBuffer(byteOffset, byteLength, data) {
        const buffer = this.context.newIndicesBuffer();
        buffer.data = new Uint8Array(data, byteOffset, byteLength);
        return buffer;
    }
    newAttributesBuffer(byteStride, byteOffset, byteLength, data) {
        const buffer = this.context.newAttributesBuffer(byteStride);
        buffer.data = new Uint8Array(data, byteOffset, byteLength);
        return buffer;
    }
    deleteBuffer(buffer) {
        buffer.delete();
    }
    bind(attributeName, buffer, byteOffset, normalized, accessor) {
        const variableInfo = toVariableInfo(accessor);
        const attribute = this.attributes[attributeName];
        if (attribute) {
            attribute.pointTo(buffer, byteOffset, normalized, variableInfo);
        }
    }
    bindIndices(buffer) {
        buffer.bind();
    }
    setToZero(attributeName) {
        const attribute = this.attributes[attributeName];
        if (attribute instanceof AttributesBuffer) {
            attribute.setTo(0);
        }
    }
    setIndexComponentType(componentType) {
        if (componentType === WebGLRenderingContext.UNSIGNED_INT) {
            const ext = this.context.gl.getExtension('OES_element_index_uint');
            if (!ext) {
                failure("OES_element_index_uint extension is not supported");
            }
        }
    }
    draw(componentType, mode, count, byteOffset) {
        this.context.gl.drawElements(mode, count, componentType, byteOffset);
    }
    drawIndexed(mode, count, byteOffset) {
        this.context.gl.drawArrays(mode, byteOffset, count);
    }
    get positionsMat() {
        return asMat(this.positionsMatUniform.data);
    }
    set positionsMat(mat) {
        this.positionsMatUniform.data = aether.mat4.columnMajorArray(mat);
    }
    get normalsMat() {
        return asMat(this.normalsMatUniform.data);
    }
    set normalsMat(mat) {
        this.normalsMatUniform.data = aether.mat4.columnMajorArray(mat);
    }
}
function asVec(array, offset = 0) {
    return [...array.slice(offset, offset + 4)];
}
function asMat(array, offset = 0) {
    return [
        asVec(array, offset + 0),
        asVec(array, offset + 4),
        asVec(array, offset + 8),
        asVec(array, offset + 12)
    ];
}
function toVariableInfo(accessor) {
    const result = asVariableInfo({
        name: "attribute",
        size: 1,
        type: glTypeOf(accessor)
    }, accessor.componentType);
    return result;
}
function glTypeOf(accessor) {
    switch (accessor.type) {
        case "SCALAR": return accessor.componentType;
        case "VEC2": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC2 : WebGLRenderingContext.INT_VEC2;
        case "VEC3": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC3 : WebGLRenderingContext.INT_VEC3;
        case "VEC4": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC4 : WebGLRenderingContext.INT_VEC4;
        case "MAT2": return WebGLRenderingContext.FLOAT_MAT2;
        case "MAT3": return WebGLRenderingContext.FLOAT_MAT3;
        case "MAT4": return WebGLRenderingContext.FLOAT_MAT4;
    }
}
//# sourceMappingURL=gltf.gl.js.map