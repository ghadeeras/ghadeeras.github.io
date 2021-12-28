import { Buffer, Device, VertexElement } from "."
import { Renderer, Accessor } from "../gltf/index.js"
import { failure } from "../utils";
import * as aether from "/aether/latest/index.js"

export class GPURenderer implements Renderer<Buffer, Buffer> {

    private zeroBuffer: Buffer;

    constructor(
        private device: Device, 
        private attributes: Record<string, [number, number]>,
        private positionsMatSetter: (mat: aether.Mat4) => void, 
        private normalsMatSetter: (mat: aether.Mat4) => void
    ) {
        this.zeroBuffer = this.newAttributesBuffer(16, 0, 16, new Uint32Array([0, 0, 0, 0]))
        for (const key of Object.keys(attributes)) {
            this.setToZero(key)
        }
    }

    newIndicesBuffer(byteOffset: number, byteLength: number, data: ArrayBuffer): Buffer {
        return this.device.buffer(GPUBufferUsage.INDEX, new DataView(data, byteOffset, byteLength))
    }

    newAttributesBuffer(byteStride: number, byteOffset: number, byteLength: number, data: ArrayBuffer): Buffer {
        return this.device.buffer(GPUBufferUsage.VERTEX, new DataView(data, byteOffset, byteLength), byteStride)
    }

    deleteBuffer(buffer: Buffer): void {
        buffer.destroy()
    }

    bind(attributeName: string, buffer: Buffer, accessor: Accessor): void {
        failure("Not implemented yet!")
    }

    bindIndices(buffer: Buffer): void {
        failure("Not implemented yet!")
    }

    setToZero(attributeName: string): void {
        this.bind(attributeName, this.zeroBuffer, {
            componentType: WebGLRenderingContext.FLOAT,
            count: 1,
            type: "VEC4"
        })
    }

    setIndexComponentType(componentType: number): void {
        failure("Not implemented yet!")
    }

    drawIndexed(componentType: number, mode: number, count: number, byteOffset: number): void {
        failure("Not implemented yet!")
    }

    draw(mode: number, count: number, byteOffset: number): void {
        failure("Not implemented yet!")
    }

    setPositionsMat(mat: aether.Mat<4>) {
        this.positionsMatSetter(mat)
    }

    setNormalsMat(mat: aether.Mat<4>) {
        this.normalsMatSetter(mat)
    }

} 
