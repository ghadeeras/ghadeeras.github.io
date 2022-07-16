import { aether } from "/gen/libs.js"
import { Attribute } from "./attribute.js"
import { AttributesBuffer, IndicesBuffer } from "./buffer.js"
import { Context } from "./context.js"
import { asVariableInfo, VariableInfo } from "./introspection.js"
import { Uniform } from "./uniform.js"
import { Resource } from "../index.js"
import * as renderer from "../gltf/gltf.renderer.js"
import * as graph from "../gltf/gltf.graph.js"

class MatrixBuffer implements Resource {

    constructor(readonly matrices: renderer.Matrix[]) {}

    destroy(): void {
    }

}

export class GLRenderer extends renderer.GLTFRenderer<MatrixBuffer, AttributesBuffer, IndicesBuffer, Context> {

    constructor(
        model: graph.Model,
        context: Context, 
        attributes: Partial<Record<string, Attribute>>, 
        positionsMatUniform: Uniform, 
        normalsMatUniform: Uniform
    ) {
        super(model, new GLAdapter(context, attributes, positionsMatUniform, normalsMatUniform))
    }

}

export class GLAdapter implements renderer.APIAdapter<MatrixBuffer, AttributesBuffer, IndicesBuffer, Context> {

    constructor(
        private context: Context, 
        private attributes: Partial<Record<string, Attribute>>, 
        private positionsMatUniform: Uniform, 
        private normalsMatUniform: Uniform
    ) {
    }

    matricesBuffer(matrices: renderer.Matrix[]): MatrixBuffer {
        return new MatrixBuffer(matrices)
    }

    vertexBuffer(view: DataView, stride: number): AttributesBuffer {
        const buffer = this.context.newAttributesBuffer(stride)
        buffer.data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
        return buffer
    }

    indexBuffer(view: DataView): IndicesBuffer {
        const buffer = this.context.newIndicesBuffer()
        buffer.data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
        return buffer
    }

    matrixBinder(matrixBuffer: MatrixBuffer, index: number): renderer.Binder<Context> {
        const matrix = matrixBuffer.matrices[index]
        const positionsMat = aether.mat4.columnMajorArray(matrix.matrix)
        const normalsMat = aether.mat4.columnMajorArray(matrix.antiMatrix)
        return () => {
            this.positionsMatUniform.data = positionsMat
            this.normalsMatUniform.data = normalsMat
        }
    }

    primitiveBinder(count: number, mode: number, attributes: renderer.VertexAttribute<AttributesBuffer>[], index: renderer.Index<IndicesBuffer> | null = null): renderer.Binder<Context> {
        const binders: renderer.Binder<Context>[] = []
        for (const vertexAttribute of attributes) {
            const attribute = this.attributes[vertexAttribute.name]
            if (attribute !== undefined) {
                binders.push(() => attribute.pointTo(
                    vertexAttribute.buffer, 
                    vertexAttribute.offset, 
                    vertexAttribute.normalized, 
                    toVariableInfo(vertexAttribute)
                ))
            }
        }
        return index !== null ? context => {
            index.buffer.bind()
            binders.forEach(binder => binder(context))
            context.gl.drawElements(mode, count, index.componentType, index.offset)
        } : context => {
            binders.forEach(binder => binder(context))
            context.gl.drawArrays(mode, 0, count)
        }
    }

} 

function toVariableInfo(attribute: renderer.VertexAttribute<AttributesBuffer>): VariableInfo {
    const result = asVariableInfo({
        name: "attribute",
        size: 1,
        type: glTypeOf(attribute)
    }, attribute.componentType)
    return result
}

function glTypeOf(attribute: renderer.VertexAttribute<AttributesBuffer>) {
    switch (attribute.type) {
        case "SCALAR": return attribute.componentType
        case "VEC2": return attribute.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC2 : WebGL2RenderingContext.INT_VEC2  
        case "VEC3": return attribute.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC3 : WebGL2RenderingContext.INT_VEC3  
        case "VEC4": return attribute.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC4 : WebGL2RenderingContext.INT_VEC4  
        case "MAT2": return WebGL2RenderingContext.FLOAT_MAT2  
        case "MAT3": return WebGL2RenderingContext.FLOAT_MAT3  
        case "MAT4": return WebGL2RenderingContext.FLOAT_MAT4  
    }
}
