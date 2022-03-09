import { aether } from "/gen/libs.js";
import { asVariableInfo } from "./introspection.js";
export class GLRenderer {
    constructor(context, attributes, positionsMatUniform, normalsMatUniform) {
        this.context = context;
        this.attributes = attributes;
        this.positionsMatUniform = positionsMatUniform;
        this.normalsMatUniform = normalsMatUniform;
        for (const key of Object.keys(attributes)) {
            this.setToZero(key);
        }
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
    bind(attributeName, buffer, accessor) {
        var _a, _b;
        const variableInfo = toVariableInfo(accessor);
        const byteOffset = (_a = accessor.byteOffset) !== null && _a !== void 0 ? _a : 0;
        const normalized = (_b = accessor.normalized) !== null && _b !== void 0 ? _b : false;
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
        const value = new Array(attribute.info.itemSize);
        value.fill(0);
        attribute.setTo(...value);
    }
    drawIndexed(componentType, mode, count, byteOffset) {
        this.context.gl.drawElements(mode, count, componentType, byteOffset);
    }
    draw(mode, count, byteOffset) {
        this.context.gl.drawArrays(mode, byteOffset, count);
    }
    setPositionsMat(mat) {
        this.positionsMatUniform.data = aether.mat4.columnMajorArray(mat);
    }
    setNormalsMat(mat) {
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
        case "VEC2": return accessor.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC2 : WebGL2RenderingContext.INT_VEC2;
        case "VEC3": return accessor.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC3 : WebGL2RenderingContext.INT_VEC3;
        case "VEC4": return accessor.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC4 : WebGL2RenderingContext.INT_VEC4;
        case "MAT2": return WebGL2RenderingContext.FLOAT_MAT2;
        case "MAT3": return WebGL2RenderingContext.FLOAT_MAT3;
        case "MAT4": return WebGL2RenderingContext.FLOAT_MAT4;
    }
}
//# sourceMappingURL=gltf.gl.js.map