import * as aether from "aether"
import { wgl } from "lumen"
import { Resource } from "lumen"
import * as renderer from "./gltf/gltf.renderer.js"
import * as graph from "./gltf/gltf.graph.js"

class MatrixBuffer implements Resource {

    constructor(readonly matrices: renderer.Matrix[]) {}

    destroy(): void {
    }

}

class DummyResource implements Resource {

    destroy(): void {
    }

}

export class GLRenderer extends renderer.GLTFRenderer<MatrixBuffer, Resource, wgl.AttributesBuffer, wgl.IndicesBuffer, wgl.Context> {

    constructor(
        model: graph.Model,
        context: wgl.Context, 
        attributes: Partial<Record<string, wgl.Attribute>>, 
        positionsMatUniform: wgl.Uniform, 
        normalsMatUniform: wgl.Uniform
    ) {
        super(model, new GLAdapter(context, attributes, positionsMatUniform, normalsMatUniform))
    }

}

export class GLAdapter implements renderer.APIAdapter<MatrixBuffer, Resource, wgl.AttributesBuffer, wgl.IndicesBuffer, wgl.Context> {

    constructor(
        private context: wgl.Context, 
        private attributes: Partial<Record<string, wgl.Attribute>>, 
        private positionsMatUniform: wgl.Uniform, 
        private normalsMatUniform: wgl.Uniform
    ) {
    }

    nodeLevelResources(matrices: renderer.Matrix[]): MatrixBuffer {
        return new MatrixBuffer(matrices)
    }

    primitiveLevelResources(materials: graph.Material[]): Resource {
        return new DummyResource()
    }

    vertexBuffer(view: DataView, stride: number): wgl.AttributesBuffer {
        const buffer = this.context.newAttributesBuffer(stride)
        buffer.data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
        return buffer
    }

    indexBuffer(view: DataView): wgl.IndicesBuffer {
        const buffer = this.context.newIndicesBuffer()
        buffer.data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
        return buffer
    }

    nodeLevelBinder(matrixBuffer: MatrixBuffer, index: number): renderer.RenderingRoutine<wgl.Context> {
        const matrix = matrixBuffer.matrices[index]
        const positionsMat = aether.mat4.columnMajorArray(matrix.matrix)
        const normalsMat = aether.mat4.columnMajorArray(matrix.antiMatrix)
        return () => {
            this.positionsMatUniform.data = positionsMat
            this.normalsMatUniform.data = normalsMat
        }
    }

    primitiveLevelRenderingRoutine(count: number, mode: number, _uniforms: Resource, _materialIndex: number, attributes: renderer.VertexAttribute<wgl.AttributesBuffer>[], index: renderer.Index<wgl.IndicesBuffer> | null = null): renderer.RenderingRoutine<wgl.Context> {
        const binders: renderer.RenderingRoutine<wgl.Context>[] = []
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

function toVariableInfo(attribute: renderer.VertexAttribute<wgl.AttributesBuffer>): wgl.VariableInfo {
    const result = wgl.asVariableInfo({
        name: "attribute",
        size: 1,
        type: glTypeOf(attribute)
    }, attribute.componentType)
    return result
}

function glTypeOf(attribute: renderer.VertexAttribute<wgl.AttributesBuffer>) {
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
