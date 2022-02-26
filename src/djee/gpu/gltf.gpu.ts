import * as gltf from "../gltf/gltf.graph.js";
import { failure } from "../utils";
import { Buffer } from "./buffer.js";
import { Device } from "./device.js";
import { DataTypeOf, mat4x4, struct } from "./types.js";
import { aether } from "/gen/libs.js";

export class GPURenderer {

    private nodeRenderers: Map<gltf.Node, Renderer>
    private primitiveRenderers: Map<gltf.Primitive, Renderer>

    constructor(
        private model: gltf.Model, 
        device: Device, 
        bindGroupIndex: number,
        attributeLocations: Record<string, number>, 
        bindGroupSupplier: (buffer: Buffer, offset: number) => GPUBindGroup,
        pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ) {
        this.nodeRenderers = this.createNodeRenderers(device, bindGroupIndex, bindGroupSupplier)
        this.primitiveRenderers = this.createPrimitiveRenderers(device, attributeLocations, pipelineSupplier);
    }

    private createNodeRenderers(
        device: Device, 
        bindGroupIndex: number, 
        bindGroupSupplier: (buffer: Buffer, offset: number) => GPUBindGroup,
    ): Map<gltf.Node, Renderer> {
        const matrices = collectSceneMatrices(this.model.scene)
        const dataView = matricesStruct.view(matrices)
        const buffer = device.buffer(GPUBufferUsage.UNIFORM, dataView, matricesStruct.stride)
        return this.createSceneNodeRenderers((node, offset) => {
            const bindGroup = bindGroupSupplier(buffer, offset)
            this.nodeRenderers.set(node, pass => pass.setBindGroup(bindGroupIndex, bindGroup))
        });
    }

    private createSceneNodeRenderers(adder: (node: gltf.Node, offset: number) => void, map: Map<gltf.Node, Renderer> = new Map()): Map<gltf.Node, Renderer> {
        for (const node of this.model.scene.nodes) {
            this.createNodeChildRenderers(node, adder, map)
        }
        return map
    }

    private createNodeChildRenderers(node: gltf.Node, adder: (node: gltf.Node, offset: number) => void, map: Map<gltf.Node, Renderer> = new Map()): Map<gltf.Node, Renderer> {
        if (node.meshes.length > 0) {
            adder(node, matricesStruct.paddedSize * this.nodeRenderers.size)
        }
        for (const child of node.children) {
            this.createNodeChildRenderers(child, adder, map)
        }
        return map
    }

    private createPrimitiveRenderers(
        device: Device, 
        attributeLocations: Record<string, number>, 
        pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ): Map<gltf.Primitive, Renderer> {
        const buffers = this.gpuBuffers(device);
        const primitiveRenderers = new Map<gltf.Primitive, Renderer>()
        for (const mesh of this.model.meshes) {
            for (const primitive of mesh.primitives) {
                const renderer = primitiveRenderer(primitive, buffers, attributeLocations, pipelineSupplier);
                primitiveRenderers.set(primitive, renderer);
            }
        }
        return primitiveRenderers
    }

    private gpuBuffers(device: Device) {
        const buffers: Map<gltf.BufferView, Buffer> = new Map();
        for (const bufferView of this.model.bufferViews) {
            buffers.set(bufferView, device.buffer(
                bufferView.index ? GPUBufferUsage.INDEX : GPUBufferUsage.VERTEX,
                new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength),
                bufferView.byteStride
            ));
        }
        return buffers;
    }
    
    render(pass: GPURenderPassEncoder) {
        for (const node of this.model.scene.nodes) {
            this.renderNode(pass, node)
        }
    }

    renderNode(pass: GPURenderPassEncoder, node: gltf.Node) {
        const renderer = this.nodeRenderers.get(node)
        if (renderer !== undefined) {
            renderer(pass)
            for (const mesh of node.meshes) {
                this.renderMesh(pass, mesh)
            }
        }
        for (const child of node.children) {
            this.renderNode(pass, child)
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

type Renderer = (pass: GPURenderPassEncoder) => void

const matricesStruct = struct({
    matrix: mat4x4,
    antiMatrix: mat4x4,
}, ["matrix", "antiMatrix"])

function collectSceneMatrices(scene: gltf.Scene, mat: aether.Mat4 = aether.mat4.identity(), antiMat: aether.Mat4 = aether.mat4.identity(), matrices: DataTypeOf<typeof matricesStruct>[] = []): DataTypeOf<typeof matricesStruct>[] {
    for (const node of scene.nodes) {
        collectNodeMatrices(node, mat, antiMat, matrices)
    }
    return matrices
}

function collectNodeMatrices(node: gltf.Node, mat: aether.Mat4 = aether.mat4.identity(), antiMat: aether.Mat4 = aether.mat4.identity(), matrices: DataTypeOf<typeof matricesStruct>[] = []): DataTypeOf<typeof matricesStruct>[] {
    const matrix = aether.mat4.mul(mat, node.matrix)
    const antiMatrix = aether.mat4.mul(antiMat, node.antiMatrix)
    if (node.meshes.length > 0) {
        matrices.push({ matrix, antiMatrix })
    }
    for (const child of node.children) {
        collectNodeMatrices(child, matrix, antiMatrix, matrices)
    }
    return matrices
}

function primitiveRenderer(
    primitive: gltf.Primitive, 
    buffers: Map<gltf.BufferView, Buffer>, 
    attributeLocations: Record<string, number>, 
    pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline
): Renderer {
    const viewLayoutTuples = asBufferViewGPUVertexBufferLayoutTuples(primitive, attributeLocations);
    const primitiveState = asGPUPrimitiveState(primitive);
    const bufferLayouts = viewLayoutTuples.map(([view, layout]) => layout);
    const primitiveBuffers = viewLayoutTuples.map(([view, layout]) => buffers.get(view) ?? failure<Buffer>("Missing vertex buffer!"));
    const pipeline = pipelineSupplier(bufferLayouts, primitiveState);
    const indexBuffer = primitive.indices !== null ?
        buffers.get(primitive.indices.bufferView) ?? failure<Buffer>("Missing index buffer!") :
        null;
    return indexBuffer !== null ?
        pass => {
            pass.setPipeline(pipeline);
            primitiveBuffers.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.buffer));
            pass.setIndexBuffer(indexBuffer.buffer, primitiveState.stripIndexFormat ?? "uint32");
            pass.drawIndexed(primitive.count);
        } :
        pass => {
            pass.setPipeline(pipeline);
            primitiveBuffers.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.buffer));
            pass.draw(primitive.count);
        };
}

function asBufferViewGPUVertexBufferLayoutTuples(primitive: gltf.Primitive, attributeLocations: Record<string, number>) {
    const layouts: Map<gltf.BufferView, Map<number, gltf.Accessor>> = new Map();
    for (const attribute of Object.keys(primitive.attributes)) {
        const accessor = primitive.attributes[attribute];
        const location = attributeLocations[attribute];
        const layout = computeIfAbsent(layouts, accessor.bufferView, () => new Map());
        layout.set(location, accessor);
    }

    const bufferLayouts: [gltf.BufferView, GPUVertexBufferLayout][] = [];
    for (const [bufferView, accessors] of layouts.entries()) {
        
        const attributes: GPUVertexAttribute[] = [];
        for (const [location, accessor] of accessors.entries()) {
            attributes.push({
                format: asGPUVertexFormat(accessor),
                offset: accessor.byteOffset,
                shaderLocation: location,
            });
        }

        bufferLayouts.push([bufferView, {
            arrayStride: bufferView.byteStride,
            attributes: attributes,
            stepMode: "vertex",
        }]);
    }
    return bufferLayouts;
}

function asGPUVertexFormat(accessor: gltf.Accessor): GPUVertexFormat {
    switch (accessor.type) {
        case "SCALAR": switch (accessor.componentType) {
            case WebGLRenderingContext.FLOAT: return "float32"
            case WebGLRenderingContext.INT: return "sint32"
            case WebGLRenderingContext.UNSIGNED_INT: return "uint32"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC2": switch (accessor.componentType) {
            case WebGLRenderingContext.FLOAT: return "float32x2"
            case WebGLRenderingContext.INT: return "sint32x2"
            case WebGLRenderingContext.UNSIGNED_INT: return "uint32x2"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC3": switch (accessor.componentType) {
            case WebGLRenderingContext.FLOAT: return "float32x3"
            case WebGLRenderingContext.INT: return "sint32x3"
            case WebGLRenderingContext.UNSIGNED_INT: return "uint32x3"
            default: return failure("Unsupported accessor type!") 
        }
        case "VEC4": switch (accessor.componentType) {
            case WebGLRenderingContext.FLOAT: return "float32x4"
            case WebGLRenderingContext.INT: return "sint32x4"
            case WebGLRenderingContext.UNSIGNED_INT: return "uint32x4"
            default: return failure("Unsupported accessor type!") 
        }
        default: return failure("Unsupported accessor type!") 
    }
}

function asGPUindexFormat(accessor: gltf.Accessor): GPUIndexFormat {
    switch (accessor.componentType) {
        case WebGLRenderingContext.UNSIGNED_INT: return "uint32"
        case WebGLRenderingContext.UNSIGNED_SHORT: return "uint16"
        default: return failure("Unsupported accessor type!") 
    }
}

function asGPUPrimitiveState(primitive: gltf.Primitive): GPUPrimitiveState {
    const topology = asGPUPrimitiveTopology(primitive.mode);
    return {
        topology: topology,
        stripIndexFormat: topology.endsWith("strip") ?
            primitive.indices !== null ? asGPUindexFormat(primitive.indices) : "uint32" :
            undefined
    }
}

function asGPUPrimitiveTopology(mode: number): GPUPrimitiveTopology {
    switch (mode) {
        case WebGLRenderingContext.TRIANGLES: return "triangle-list"
        case WebGLRenderingContext.TRIANGLE_STRIP: return "triangle-strip"
        case WebGLRenderingContext.LINES: return "line-list"
        case WebGLRenderingContext.LINE_STRIP: return "line-strip"
        case WebGLRenderingContext.POINTS: return "point-list"
        default: return failure("Unsupported primitive mode!")
    }
}

function computeIfAbsent<K, V>(map: Map<K, V>, key: K, computer: (key: K) => V) {
    let result = map.get(key);
    if (result === undefined) {
        result = computer(key);
        map.set(key, result);
    }
    return result;
}
