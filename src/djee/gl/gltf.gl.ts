import { aether } from "/gen/libs.js"
import { Attribute } from "./attribute.js"
import { AttributesBuffer, Buffer, IndicesBuffer } from "./buffer.js"
import { Context } from "./context.js"
import { asVariableInfo, VariableInfo } from "./introspection.js"
import { Uniform } from "./uniform.js"
import { failure } from "../utils.js"
import { Accessor, Renderer } from "../gltf/gltf.js"

export class GLRenderer implements Renderer<IndicesBuffer, AttributesBuffer> {

    constructor(
        private context: Context, 
        private attributes: Record<string, Attribute>, 
        private positionsMatUniform: Uniform, 
        private normalsMatUniform: Uniform
    ) {
        for (const key of Object.keys(attributes)) {
            this.setToZero(key)
        }
    }

    newIndicesBuffer(byteOffset: number, byteLength: number, data: ArrayBuffer): IndicesBuffer {
        const buffer = this.context.newIndicesBuffer()
        buffer.data = new Uint8Array(data, byteOffset, byteLength)
        return buffer
    }

    newAttributesBuffer(byteStride: number, byteOffset: number, byteLength: number, data: ArrayBuffer): AttributesBuffer {
        const buffer = this.context.newAttributesBuffer(byteStride)
        buffer.data = new Uint8Array(data, byteOffset, byteLength)
        return buffer
    }

    deleteBuffer(buffer: Buffer): void {
        buffer.delete()
    }

    bind(attributeName: string, buffer: AttributesBuffer, accessor: Accessor): void {
        const variableInfo = toVariableInfo(accessor)
        const byteOffset = accessor.byteOffset ?? 0
        const normalized = accessor.normalized ?? false
        const attribute = this.attributes[attributeName]
        if (attribute) {
            attribute.pointTo(buffer, byteOffset, normalized, variableInfo)
        }
    }

    bindIndices(buffer: IndicesBuffer): void {
        buffer.bind()
    }

    setToZero(attributeName: string): void {
        const attribute = this.attributes[attributeName]
        const value = new Array<number>(attribute.info.itemSize)
        value.fill(0)
        attribute.setTo(...value)
    }

    drawIndexed(componentType: number, mode: number, count: number, byteOffset: number): void {
        this.context.gl.drawElements(mode, count, componentType, byteOffset)
    }

    draw(mode: number, count: number, byteOffset: number): void {
        this.context.gl.drawArrays(mode, byteOffset, count)
    }

    setPositionsMat(mat: aether.Mat<4>) {
        this.positionsMatUniform.data = aether.mat4.columnMajorArray(mat)
    }

    setNormalsMat(mat: aether.Mat<4>) {
        this.normalsMatUniform.data = aether.mat4.columnMajorArray(mat)
    }

} 

function asVec(array: number[] | Float32Array | Float64Array, offset: number = 0): aether.Vec<4> {
    return [...array.slice(offset, offset + 4)] as aether.Vec<4>
}

function asMat(array: number[] | Float32Array | Float64Array, offset: number = 0): aether.Mat<4> {
    return [
        asVec(array, offset +  0),
        asVec(array, offset +  4),
        asVec(array, offset +  8),
        asVec(array, offset + 12)
    ]
}

function toVariableInfo(accessor: Accessor): VariableInfo {
    const result = asVariableInfo({
        name: "attribute",
        size: 1,
        type: glTypeOf(accessor)
    }, accessor.componentType)
    return result
}

function glTypeOf(accessor: Accessor) {
    switch (accessor.type) {
        case "SCALAR": return accessor.componentType
        case "VEC2": return accessor.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC2 : WebGL2RenderingContext.INT_VEC2  
        case "VEC3": return accessor.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC3 : WebGL2RenderingContext.INT_VEC3  
        case "VEC4": return accessor.componentType == WebGL2RenderingContext.FLOAT ? WebGL2RenderingContext.FLOAT_VEC4 : WebGL2RenderingContext.INT_VEC4  
        case "MAT2": return WebGL2RenderingContext.FLOAT_MAT2  
        case "MAT3": return WebGL2RenderingContext.FLOAT_MAT3  
        case "MAT4": return WebGL2RenderingContext.FLOAT_MAT4  
    }
}
