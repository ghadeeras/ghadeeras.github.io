import * as gltf from "../gltf/gltf.graph.js";
import { failure } from "../utils.js";
import { Buffer } from "./buffer.js";
import { Device } from "./device.js";
import { DataTypeOf, mat4x4, struct } from "./types.js";
import { aether } from "/gen/libs.js";

type Renderer = (pass: GPURenderPassEncoder) => void

const matricesStruct = struct({
    matrix: mat4x4,
    antiMatrix: mat4x4,
}, ["matrix", "antiMatrix"]).clone(0, 256, false)

type Matrix = DataTypeOf<typeof matricesStruct>

export class GPURenderer {

    private nodeRenderers: Map<gltf.Node | gltf.Scene, Renderer>
    private primitiveRenderers: Map<gltf.Primitive, Renderer>
    
    private resources: { destroy(): void }[] = []

    constructor(
        private model: gltf.Model, 
        private device: Device, 
        bindGroupIndex: number,
        attributeLocations: Partial<Record<string, number>>, 
        bindGroupSupplier: (buffer: Buffer, offset: number) => GPUBindGroup,
        pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ) {
        this.nodeRenderers = this.createNodeRenderers(bindGroupIndex, bindGroupSupplier)
        this.primitiveRenderers = this.createPrimitiveRenderers(attributeLocations, caching(pipelineSupplier));
    }

    destroy() {
        while (this.resources.length > 0) {
            this.resources.pop()?.destroy()
        }
    }

    private createNodeRenderers(bindGroupIndex: number, bindGroupSupplier: (buffer: Buffer, offset: number) => GPUBindGroup) {
        const matrices = collectSceneMatrices(this.model.scene)
        const dataView = matricesStruct.view(matrices)
        const buffer = this.device.buffer(GPUBufferUsage.UNIFORM, dataView, matricesStruct.stride)
        this.resources.push(buffer)
        return createSceneNodeRenderers(this.model.scene, offset => {
            const bindGroup = bindGroupSupplier(buffer, offset)
            return pass => pass.setBindGroup(bindGroupIndex, bindGroup)
        });
    }

    private createPrimitiveRenderers(
        attributeLocations: Partial<Record<string, number>>, 
        pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ): Map<gltf.Primitive, Renderer> {
        const buffers = this.gpuBuffers();
        const primitiveRenderers = new Map<gltf.Primitive, Renderer>()
        for (const mesh of this.model.meshes) {
            for (const primitive of mesh.primitives) {
                const renderer = primitiveRenderer(primitive, buffers, attributeLocations, pipelineSupplier);
                primitiveRenderers.set(primitive, renderer);
            }
        }
        return primitiveRenderers
    }

    private gpuBuffers() {
        const buffers: Map<gltf.BufferView, Buffer> = new Map();
        for (const bufferView of this.model.bufferViews) {
            let dataView = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
            if (bufferView.byteStride == 1) {
                const oldBuffer = new Uint8Array(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength)
                const newBuffer = new Uint16Array(bufferView.byteLength)
                newBuffer.set(oldBuffer)
                dataView = new DataView(newBuffer.buffer)
            }
            const buffer = this.device.buffer(
                bufferView.index ? GPUBufferUsage.INDEX | GPUBufferUsage.VERTEX : GPUBufferUsage.VERTEX,
                dataView,
                bufferView.byteStride
            );
            buffers.set(bufferView, buffer);
            this.resources.push(buffer)
        }
        return buffers;
    }
    
    render(pass: GPURenderPassEncoder) {
        const renderer: Renderer = this.nodeRenderers.get(this.model.scene) ?? failure("There must be at least a scene renderer!");
        renderer(pass)
        for (const node of this.model.scene.nodes) {
            this.renderNode(pass, node, renderer)
        }
    }

    renderNode(pass: GPURenderPassEncoder, node: gltf.Node, parentRenderer: Renderer) {
        const renderer = this.nodeRenderers.get(node) ?? parentRenderer
        if (node.meshes.length > 0) {
            renderer(pass)
        }
        for (const mesh of node.meshes) {
            this.renderMesh(pass, mesh)
        }
        for (const child of node.children) {
            this.renderNode(pass, child, renderer)
        }
    }

    renderMesh(pass: GPURenderPassEncoder, mesh: gltf.Mesh) {
        for (const primitive of mesh.primitives) {
            this.renderPrimitive(pass, primitive)
        }
    }

    renderPrimitive(pass: GPURenderPassEncoder, primitive: gltf.Primitive) {
        const renderer: Renderer = this.primitiveRenderers.get(primitive) ?? failure(`No renderer for primitive ${primitive.key}`)
        renderer(pass)
    }

}

function collectSceneMatrices(scene: gltf.Scene): Matrix[] {
    const matrix: Matrix = {
        matrix: scene.matrix,
        antiMatrix: aether.mat4.identity()
    }
    const matrices = [matrix]
    for (const node of scene.nodes) {
        collectNodeMatrices(node, false, matrix, matrices)
    }
    return matrices
}

function collectNodeMatrices(node: gltf.Node, parentDirty: boolean, parentMatrix: Matrix, matrices: Matrix[]): Matrix[] {
    const matrix: Matrix = {
        matrix: aether.mat4.mul(parentMatrix.matrix, node.matrix),
        antiMatrix: aether.mat4.mul(parentMatrix.antiMatrix, node.antiMatrix)
    }
    let dirty = parentDirty || !node.isIdentityMatrix
    if (dirty && node.meshes.length > 0) {
        matrices.push(matrix)
        dirty = false
    }
    for (const child of node.children) {
        collectNodeMatrices(child, dirty, matrix, matrices)
    }
    return matrices
}

function createSceneNodeRenderers(scene: gltf.Scene, rendererForOffset: (offset: number) => Renderer): Map<gltf.Node | gltf.Scene, Renderer> {
    const map: Map<gltf.Node | gltf.Scene, Renderer> = new Map()
    map.set(scene, rendererForOffset(0))
    for (const node of scene.nodes) {
        createNodeChildRenderers(node, false, rendererForOffset, map)
    }
    return map
}

function createNodeChildRenderers(node: gltf.Node, parentDirty: boolean, rendererForOffset: (offset: number) => Renderer, map: Map<gltf.Node | gltf.Scene, Renderer>): Map<gltf.Node | gltf.Scene, Renderer> {
    let dirty = parentDirty || !node.isIdentityMatrix
    if (dirty && node.meshes.length > 0) {
        map.set(node, rendererForOffset(map.size * matricesStruct.stride))
        dirty = false
    }
    for (const child of node.children) {
        createNodeChildRenderers(child, dirty, rendererForOffset, map)
    }
    return map
}

type VertexBuffer = {
    gpuBuffer: GPUBuffer,
    gpuLayout: GPUVertexBufferLayout,
    offset: number,
}

type IndexBuffer = {
    gpuBuffer: GPUBuffer,
    gpuFormat: GPUIndexFormat,
    offset: number,
}

function primitiveRenderer(
    primitive: gltf.Primitive, 
    buffers: Map<gltf.BufferView, Buffer>, 
    attributeLocations: Partial<Record<string, number>>, 
    pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline
): Renderer {
    const indexBuffer = asIndexBuffer(primitive, buffers);
    const vertexBuffers = asVertexBuffers(primitive, buffers, attributeLocations);
    
    const bufferLayouts = vertexBuffers.map(b => b.gpuLayout);
    const primitiveState = asGPUPrimitiveState(primitive);
    const pipeline = pipelineSupplier(bufferLayouts, primitiveState);
    
    return indexBuffer !== null ?
        pass => {
            pass.setPipeline(pipeline);
            vertexBuffers.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.gpuBuffer, buffer.offset));
            pass.setIndexBuffer(indexBuffer.gpuBuffer, indexBuffer.gpuFormat, indexBuffer.offset);
            pass.drawIndexed(primitive.count);
        } :
        pass => {
            pass.setPipeline(pipeline);
            vertexBuffers.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.gpuBuffer, buffer.offset));
            pass.draw(primitive.count);
        };
}

function asIndexBuffer(primitive: gltf.Primitive, buffers: Map<gltf.BufferView, Buffer>): IndexBuffer | null {
    return primitive.indices !== null ?
        {
            gpuBuffer: (buffers.get(primitive.indices.bufferView) ?? failure<Buffer>("Missing index buffer!")).buffer,
            gpuFormat: gpuIndexFormatOf(primitive.indices),
            offset: primitive.indices.byteOffset
        } : null;
    }

function asVertexBuffers(primitive: gltf.Primitive, buffers: Map<gltf.BufferView, Buffer>, attributeLocations: Partial<Record<string, number>>): VertexBuffer[] {
    const accessorsByViewsThenLocations = groupAccessorsByViewsThenLocations(primitive, attributeLocations);

    const vertexBuffers: VertexBuffer[] = [];
    for (const [bufferView, viewAccessorsByLocation] of accessorsByViewsThenLocations.entries()) {
        const buffer = buffers.get(bufferView)  ?? failure<Buffer>("Missing vertex buffer!")
        const stride = bufferView.byteStride !== 0 ? bufferView.byteStride : byteSizeOf(viewAccessorsByLocation);

        if (areInterleaved(viewAccessorsByLocation, stride)) {
            vertexBuffers.push(interleavedBuffer(buffer, stride, viewAccessorsByLocation));
        } else for (const [location, accessor] of viewAccessorsByLocation.entries()) {
            vertexBuffers.push(nonInterleavedBuffer(buffer, stride, accessor, location));
        }
    }
    return sortedVertexBuffers(vertexBuffers);
}

function groupAccessorsByViewsThenLocations(primitive: gltf.Primitive, attributeLocations: Partial<Record<string, number>>): Map<gltf.BufferView, Map<number, gltf.Accessor>> {
    const accessorsByViewsThenLocations: Map<gltf.BufferView, Map<number, gltf.Accessor>> = new Map();
    for (const attribute of Object.keys(primitive.attributes)) {
        const accessor = primitive.attributes[attribute];
        const location = attributeLocations[attribute];
        if (location !== undefined) {
            const viewAccessorsByLocation = computeIfAbsent(accessorsByViewsThenLocations, accessor.bufferView, () => new Map());
            viewAccessorsByLocation.set(location, accessor);
        }
    }
    return accessorsByViewsThenLocations;
}

function areInterleaved(viewAccessorsByLocation: Map<number, gltf.Accessor>, stride: number) {
    const accessors = [...viewAccessorsByLocation.values()];
    return accessors.every(accessor => accessor.byteOffset < stride);
}

function interleavedBuffer(buffer: Buffer, stride: number, viewAccessorsByLocation: Map<number, gltf.Accessor>) {
    const minOffset = Math.min(...[...viewAccessorsByLocation.values()].map(accessor => accessor.byteOffset));

    const attributes: GPUVertexAttribute[] = [];
    for (const [location, accessor] of viewAccessorsByLocation.entries()) {
        attributes.push({
            format: gpuVertexFormatOf(accessor),
            offset: accessor.byteOffset - minOffset,
            shaderLocation: location,
        });
    }

    const vertexBuffer: VertexBuffer = {
        gpuBuffer: buffer.buffer,
        offset: minOffset,
        gpuLayout: {
            arrayStride: stride,
            attributes: attributes,
            stepMode: "vertex",
        }
    };
    return vertexBuffer;
}

function nonInterleavedBuffer(buffer: Buffer, stride: number, accessor: gltf.Accessor, location: number): VertexBuffer {
    return {
        gpuBuffer: buffer.buffer,
        offset: accessor.byteOffset,
        gpuLayout: {
            arrayStride: stride,
            attributes: [{
                format: gpuVertexFormatOf(accessor),
                offset: 0,
                shaderLocation: location,
            }],
            stepMode: "vertex",
        }
    };
}

function sortedVertexBuffers(vertexBuffers: VertexBuffer[]) {
    return vertexBuffers.map(b => {
        b.gpuLayout.attributes = [...b.gpuLayout.attributes].sort((a1, a2) => a1.shaderLocation - a2.shaderLocation) 
        return b
    }).sort((b1, b2) => {
        const [a1] = b1.gpuLayout.attributes;
        const [a2] = b2.gpuLayout.attributes;
        return a1.shaderLocation - a2.shaderLocation;
    });
}

function byteSizeOf(viewAccessorsByLocation: Map<number, gltf.Accessor>) {
    return 12 * viewAccessorsByLocation.size;
}

function gpuVertexFormatOf(accessor: gltf.Accessor): GPUVertexFormat {
    switch (accessor.type) {
        case "SCALAR": switch (accessor.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32"
            case WebGL2RenderingContext.INT: return "sint32"
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC2": switch (accessor.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x2"
            case WebGL2RenderingContext.INT: return "sint32x2"
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x2"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC3": switch (accessor.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x3"
            case WebGL2RenderingContext.INT: return "sint32x3"
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x3"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC4": switch (accessor.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x4"
            case WebGL2RenderingContext.INT: return "sint32x4"
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x4"
            default: return failure("Unsupported accessor type!") 
        }
        default: return failure("Unsupported accessor type!") 
    }
}

function gpuIndexFormatOf(accessor: gltf.Accessor): GPUIndexFormat {
    switch (accessor.componentType) {
        case WebGL2RenderingContext.UNSIGNED_INT: return "uint32"
        case WebGL2RenderingContext.UNSIGNED_SHORT:
        case WebGL2RenderingContext.UNSIGNED_BYTE: return "uint16"
        default: return failure("Unsupported accessor type!") 
    }
}

function asGPUPrimitiveState(primitive: gltf.Primitive): GPUPrimitiveState {
    const topology = gpuTopologyOf(primitive);
    return {
        topology: topology,
        stripIndexFormat: topology.endsWith("strip") ?
            primitive.indices !== null ? gpuIndexFormatOf(primitive.indices) : "uint32" :
            undefined
    }
}

function gpuTopologyOf(primitive: gltf.Primitive): GPUPrimitiveTopology {
    switch (primitive.mode) {
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
        digest(bufferLayouts, primitiveState), 
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

function digest(bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState): string {
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
