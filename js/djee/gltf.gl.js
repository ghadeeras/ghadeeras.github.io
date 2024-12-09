import * as aether from "aether";
import { wgl } from "lumen";
import * as renderer from "./gltf/gltf.renderer.js";
class MatrixBuffer {
    constructor(matrices) {
        this.matrices = matrices;
    }
    destroy() {
    }
}
export class GLRenderer extends renderer.GLTFRenderer {
    constructor(model, context, attributes, positionsMatUniform, normalsMatUniform) {
        super(model, new GLAdapter(context, attributes, positionsMatUniform, normalsMatUniform));
    }
}
export class GLAdapter {
    constructor(context, attributes, positionsMatUniform, normalsMatUniform) {
        this.context = context;
        this.attributes = attributes;
        this.positionsMatUniform = positionsMatUniform;
        this.normalsMatUniform = normalsMatUniform;
    }
    matricesBuffer(matrices) {
        return new MatrixBuffer(matrices);
    }
    vertexBuffer(view, stride) {
        const buffer = this.context.newAttributesBuffer(stride);
        buffer.data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
        return buffer;
    }
    indexBuffer(view) {
        const buffer = this.context.newIndicesBuffer();
        buffer.data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
        return buffer;
    }
    matrixBinder(matrixBuffer, index) {
        const matrix = matrixBuffer.matrices[index];
        const positionsMat = aether.mat4.columnMajorArray(matrix.matrix);
        const normalsMat = aether.mat4.columnMajorArray(matrix.antiMatrix);
        return () => {
            this.positionsMatUniform.data = positionsMat;
            this.normalsMatUniform.data = normalsMat;
        };
    }
    primitiveBinder(count, mode, attributes, index = null) {
        const binders = [];
        for (const vertexAttribute of attributes) {
            const attribute = this.attributes[vertexAttribute.name];
            if (attribute !== undefined) {
                binders.push(() => attribute.pointTo(vertexAttribute.buffer, vertexAttribute.offset, vertexAttribute.normalized, toVariableInfo(vertexAttribute)));
            }
        }
        return index !== null ? context => {
            index.buffer.bind();
            binders.forEach(binder => binder(context));
            context.gl.drawElements(mode, count, index.componentType, index.offset);
        } : context => {
            binders.forEach(binder => binder(context));
            context.gl.drawArrays(mode, 0, count);
        };
    }
}
function toVariableInfo(attribute) {
    const result = wgl.asVariableInfo({
        name: "attribute",
        size: 1,
        type: glTypeOf(attribute)
    }, attribute.componentType);
    return result;
}
function glTypeOf(attribute) {
    switch (attribute.type) {
        case "SCALAR": return attribute.componentType;
        case "VEC2": return attribute.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC2 : WebGL2RenderingContext.INT_VEC2;
        case "VEC3": return attribute.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC3 : WebGL2RenderingContext.INT_VEC3;
        case "VEC4": return attribute.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC4 : WebGL2RenderingContext.INT_VEC4;
        case "MAT2": return WebGL2RenderingContext.FLOAT_MAT2;
        case "MAT3": return WebGL2RenderingContext.FLOAT_MAT3;
        case "MAT4": return WebGL2RenderingContext.FLOAT_MAT4;
    }
}
//# sourceMappingURL=gltf.gl.js.map