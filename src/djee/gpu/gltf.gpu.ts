import * as gltf from "../gltf/gltf.js";
import * as graph from "../gltf/gltf.graph.js";
import * as renderer from "../gltf/gltf.renderer.js";
import * as types from "./types.js";
import { Buffer } from "./buffer.js";
import { Device } from "./device.js";
import { failure } from "../utils.js";
import { Resource } from "../index.js";

export const gltfMatricesStruct = types.struct({
    matrix: types.mat4x4,
    antiMatrix: types.mat4x4,
}, ["matrix", "antiMatrix"]).clone(0, 256, false)

export const gltfMatrixGroupLayout = {
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
            type: "uniform",
            hasDynamicOffset: true,
        },
    }],
} satisfies GPUBindGroupLayoutDescriptor

export class MatricesResource implements Resource {
    
    constructor(readonly group: GPUBindGroup, readonly buffer: Buffer) {}

    destroy(): void {
        this.buffer.destroy()
    }

}

export class GPURendererFactory {
    
    private adapter: GPUAdapter

    constructor(
        device: Device, 
        matricesGroupIndex: number,
        attributeLocations: Partial<Record<string, number>>, 
        pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ) {
        this.adapter = new GPUAdapter(
            device, 
            device.device.createBindGroupLayout(gltfMatrixGroupLayout), 
            matricesGroupIndex, 
            attributeLocations, 
            caching(pipelineSupplier)
        )
    }

    newInstance(model: graph.Model): renderer.GLTFRenderer<MatricesResource, Buffer, Buffer, GPURenderPassEncoder> {
        return new renderer.GLTFRenderer(model, this.adapter)
    }

    get matricesGroupLayout(): GPUBindGroupLayout {
        return this.adapter.matricesGroupLayout
    }

}

class GPUAdapter implements renderer.APIAdapter<MatricesResource, Buffer, Buffer, GPURenderPassEncoder> {

    constructor(
        private device: Device, 
        readonly matricesGroupLayout: GPUBindGroupLayout,
        private matricesGroupIndex: number,
        private attributeLocations: Partial<Record<string, number>>, 
        private pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ) {}

    matricesBuffer(matrices: renderer.Matrix[]): MatricesResource {
        const dataView = gltfMatricesStruct.view(matrices)
        const buffer = this.device.buffer("matrices", GPUBufferUsage.UNIFORM, dataView, gltfMatricesStruct.stride);
        const group = this.device.device.createBindGroup({
            layout: this.matricesGroupLayout,
            entries: [{
                binding: 0,
                resource: {
                    buffer: buffer.buffer,
                    size: gltfMatricesStruct.paddedSize,
                }
            }]
        });
        return new MatricesResource(group, buffer)
    }

    vertexBuffer(dataView: DataView, stride: number): Buffer {
        return this.device.buffer("vertex", GPUBufferUsage.VERTEX, dataView, stride)
    }

    indexBuffer(dataView: DataView, stride: number): Buffer {
        return this.device.buffer("index", GPUBufferUsage.INDEX | GPUBufferUsage.VERTEX, this.adapt(dataView, stride), stride)
    }

    matrixBinder(matrixBuffer: MatricesResource, index: number): renderer.Binder<GPURenderPassEncoder> {
        return pass => pass.setBindGroup(this.matricesGroupIndex, matrixBuffer.group, [index * gltfMatricesStruct.stride])
    }

    primitiveBinder(count: number, mode: gltf.PrimitiveMode, attributes: renderer.VertexAttribute<Buffer>[], index: renderer.Index<Buffer> | null = null): renderer.Binder<GPURenderPassEncoder> {
        const topology = toGpuTopology(mode)
        const indexFormat: GPUIndexFormat = index !== null ? toGpuIndexFormat(index.componentType) : "uint32"
        const vertexBufferSlots = asVertexBufferSlots(attributes, this.attributeLocations);
        
        const bufferLayouts = vertexBufferSlots.map(b => b.gpuLayout);
        const primitiveState = {
            topology: topology,
            stripIndexFormat: topology.endsWith("strip") ? indexFormat : undefined
        }
        const pipeline = this.pipelineSupplier(bufferLayouts, primitiveState);
        
        return index !== null ?
            pass => {
                pass.setPipeline(pipeline);
                vertexBufferSlots.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.gpuBuffer, buffer.offset));
                pass.setIndexBuffer(index.buffer.buffer, indexFormat, index.offset);
                pass.drawIndexed(count);
            } :
            pass => {
                pass.setPipeline(pipeline);
                vertexBufferSlots.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.gpuBuffer, buffer.offset));
                pass.draw(count);
            };
    }

    private adapt(dataView: DataView, stride: number) {
        if (stride == 1) {
            const oldBuffer = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
            const newBuffer = new Uint16Array(dataView.byteLength);
            newBuffer.set(oldBuffer);
            dataView = new DataView(newBuffer.buffer);
        }
        return dataView;
    }
    
}

type VertexBufferSlot = {
    gpuBuffer: GPUBuffer,
    gpuLayout: GPUVertexBufferLayout,
    offset: number,
}

function asVertexBufferSlots(attributes: renderer.VertexAttribute<Buffer>[], attributeLocations: Partial<Record<string, number>>): VertexBufferSlot[] {
    const attributesByBuffersThenLocations = groupAttributesByBuffersThenLocations(attributes, attributeLocations);

    const vertexBufferSlots: VertexBufferSlot[] = [];
    for (const [buffer, bufferAttributesByLocation] of attributesByBuffersThenLocations.entries()) {
        const baseOffset = baseOffsetOf(bufferAttributesByLocation);
        if (areInterleaved(buffer.stride, baseOffset, bufferAttributesByLocation)) {
            vertexBufferSlots.push(interleavedBuffer(buffer, baseOffset, bufferAttributesByLocation));
        } else for (const [location, attribute] of bufferAttributesByLocation.entries()) {
            vertexBufferSlots.push(nonInterleavedBuffer(buffer, attribute, location));
        }
    }
    return sortedVertexBuffers(vertexBufferSlots);
}

function groupAttributesByBuffersThenLocations(attributes: renderer.VertexAttribute<Buffer>[], attributeLocations: Partial<Record<string, number>>): Map<Buffer, Map<number, renderer.VertexAttribute<Buffer>>> {
    const accessorsByBuffersThenLocations: Map<Buffer, Map<number, renderer.VertexAttribute<Buffer>>> = new Map();
    for (const attribute of attributes) {
        const location = attributeLocations[attribute.name];
        if (location !== undefined) {
            const attributesByLocations = computeIfAbsent(accessorsByBuffersThenLocations, attribute.buffer, () => new Map()); 
            attributesByLocations.set(location, attribute);
        }
    }
    return accessorsByBuffersThenLocations;
}

function areInterleaved(stride: number, baseOffset: number, bufferAttributesByLocation: Map<number, renderer.VertexAttribute<Buffer>>) {
    const attributes = [...bufferAttributesByLocation.values()];
    return attributes.every(attribute => (attribute.offset - baseOffset) < stride);
}

function interleavedBuffer(buffer: Buffer, baseOffset: number, attributesByLocation: Map<number, renderer.VertexAttribute<Buffer>>) {
    const attributes: GPUVertexAttribute[] = [];
    for (const [location, attribute] of attributesByLocation.entries()) {
        attributes.push({
            format: gpuVertexFormatOf(attribute),
            offset: attribute.offset - baseOffset,
            shaderLocation: location,
        });
    }

    const vertexBuffer: VertexBufferSlot = {
        gpuBuffer: buffer.buffer,
        offset: baseOffset,
        gpuLayout: {
            arrayStride: buffer.stride,
            attributes: attributes,
            stepMode: "vertex",
        }
    };
    return vertexBuffer;
}

function baseOffsetOf(attributesByLocation: Map<number, renderer.VertexAttribute<Buffer>>) {
    return Math.min(...[...attributesByLocation.values()].map(attribute => attribute.offset));
}

function nonInterleavedBuffer(buffer: Buffer, attribute: renderer.VertexAttribute<Buffer>, location: number): VertexBufferSlot {
    return {
        gpuBuffer: buffer.buffer,
        offset: attribute.offset,
        gpuLayout: {
            arrayStride: buffer.stride,
            attributes: [{
                format: gpuVertexFormatOf(attribute),
                offset: 0,
                shaderLocation: location,
            }],
            stepMode: "vertex",
        }
    };
}

function sortedVertexBuffers(vertexBuffers: VertexBufferSlot[]) {
    return vertexBuffers.map(b => {
        b.gpuLayout.attributes = [...b.gpuLayout.attributes].sort((a1, a2) => a1.shaderLocation - a2.shaderLocation) 
        return b
    }).sort((b1, b2) => {
        const [a1] = b1.gpuLayout.attributes;
        const [a2] = b2.gpuLayout.attributes;
        return a1.shaderLocation - a2.shaderLocation;
    });
}

function gpuVertexFormatOf(attribute: renderer.VertexAttribute<Buffer>): GPUVertexFormat {
    switch (attribute.type) {
        case "SCALAR": switch (attribute.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32"
            case WebGL2RenderingContext.INT: return "sint32"
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC2": switch (attribute.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x2"
            case WebGL2RenderingContext.INT: return "sint32x2"
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x2"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC3": switch (attribute.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x3"
            case WebGL2RenderingContext.INT: return "sint32x3"
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x3"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC4": switch (attribute.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x4"
            case WebGL2RenderingContext.INT: return "sint32x4"
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x4"
            default: return failure("Unsupported accessor type!") 
        }
        default: return failure("Unsupported accessor type!") 
    }
}

function toGpuIndexFormat(componentType: gltf.ScalarType): GPUIndexFormat {
    switch (componentType) {
        case WebGL2RenderingContext.UNSIGNED_INT: return "uint32"
        case WebGL2RenderingContext.UNSIGNED_SHORT:
        case WebGL2RenderingContext.UNSIGNED_BYTE: return "uint16"
        default: return failure("Unsupported accessor type!") 
    }
}

function toGpuTopology(primitiveMode: gltf.PrimitiveMode): GPUPrimitiveTopology {
    switch (primitiveMode) {
        case WebGL2RenderingContext.TRIANGLES: return "triangle-list"
        case WebGL2RenderingContext.TRIANGLE_STRIP: return "triangle-strip"
        case WebGL2RenderingContext.LINES: return "line-list"
        case WebGL2RenderingContext.LINE_STRIP: return "line-strip"
        case WebGL2RenderingContext.POINTS: return "point-list"
        default: return failure("Unsupported primitive mode!")
    }
}

function caching(pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline): (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline {
    const cache = new Map<string, GPURenderPipeline>()
    return (bufferLayouts, primitiveState) => computeIfAbsent(
        cache, 
        digest(bufferLayouts), 
        () => pipelineSupplier(bufferLayouts, primitiveState)
    )
}

function computeIfAbsent<K, V, T extends V>(map: Map<K, V>, key: K, computer: (key: K) => T) {
    let result = map.get(key);
    if (result === undefined) {
        result = computer(key);
        map.set(key, result);
    }
    return result;
}

function digest(bufferLayouts: GPUVertexBufferLayout[]): string {
    return [...bufferLayouts]
        .map(l => ({
            ...l, 
            attributes: [...l.attributes].sort((a1, a2) => a1.shaderLocation - a2.shaderLocation)
        }))
        .sort((l1, l2) => l1.attributes[0].shaderLocation - l2.attributes[0].shaderLocation)
        .reduce((s, l, i) => s + (i > 0 ? "|" : "") + digestLayout(l), "[") + "]"
}

function digestLayout(l: GPUVertexBufferLayout) {
    return "{" + l.arrayStride + ":" + [...l.attributes].reduce((s, a, i) => s + (i > 0 ? "|" : "") + digestAttribute(a), "[") + "]}"
}

function digestAttribute(a: GPUVertexAttribute) {
    return "{" + a.shaderLocation + ":" + a.offset + ":" + a.format + "}"
}
