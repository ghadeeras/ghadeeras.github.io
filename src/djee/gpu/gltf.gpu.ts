import * as gltf from "../gltf/gltf.graph.js";
import { failure } from "../utils.js";
import { Buffer } from "./buffer.js";
import { Device } from "./device.js";
import { DataTypeOf, mat4x4, struct } from "./types.js";
import { aether } from "/gen/libs.js";

export class GPURenderer {

    private nodeRenderers: Map<gltf.Node, Renderer>
    private primitiveRenderers: Map<gltf.Primitive, Renderer>
    
    private resources: { destroy(): void }[] = []

    constructor(
        private model: gltf.Model, 
        device: Device, 
        bindGroupIndex: number,
        attributeLocations: Partial<Record<string, number>>, 
        bindGroupSupplier: (buffer: Buffer, offset: number) => GPUBindGroup,
        pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ) {
        this.nodeRenderers = this.createNodeRenderers(device, bindGroupIndex, bindGroupSupplier)
        this.primitiveRenderers = this.createPrimitiveRenderers(device, attributeLocations, caching(pipelineSupplier));
    }

    destroy() {
        while (this.resources.length > 0) {
            this.resources.pop()?.destroy()
        }
    }

    private createNodeRenderers(
        device: Device, 
        bindGroupIndex: number, 
        bindGroupSupplier: (buffer: Buffer, offset: number) => GPUBindGroup,
    ) {
        const matrices = collectSceneMatrices(this.model.scene)
        const dataView = matricesStruct.view(matrices)
        const buffer = device.buffer(GPUBufferUsage.UNIFORM, dataView, matricesStruct.stride)
        this.resources.push(buffer)
        return this.createSceneNodeRenderers(offset => {
            const bindGroup = bindGroupSupplier(buffer, offset)
            return pass => pass.setBindGroup(bindGroupIndex, bindGroup)
        });
    }

    private createSceneNodeRenderers(renderer: (offset: number) => Renderer, offset: number = 0, map: Map<gltf.Node, Renderer> = new Map()): Map<gltf.Node, Renderer> {
        for (const node of this.model.scene.nodes) {
            this.createNodeChildRenderers(node, renderer, offset, map)
        }
        return map
    }

    private createNodeChildRenderers(node: gltf.Node, renderer: (offset: number) => Renderer, offset: number = 0, map: Map<gltf.Node, Renderer> = new Map()): Map<gltf.Node, Renderer> {
        let newOffset = offset
        if (map.size == 0 || !node.isIdentityMatrix && node.meshes.length > 0) {
            map.set(node, renderer(offset))
            newOffset += matricesStruct.stride
        }
        for (const child of node.children) {
            this.createNodeChildRenderers(child, renderer, newOffset, map)
        }
        return map
    }

    private createPrimitiveRenderers(
        device: Device, 
        attributeLocations: Partial<Record<string, number>>, 
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
            const buffer = device.buffer(
                bufferView.index ? GPUBufferUsage.INDEX | GPUBufferUsage.VERTEX : GPUBufferUsage.VERTEX,
                new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength),
                bufferView.byteStride
            );
            buffers.set(bufferView, buffer);
            this.resources.push(buffer)
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
        }
        for (const mesh of node.meshes) {
            this.renderMesh(pass, mesh)
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
}, ["matrix", "antiMatrix"]).clone(0, 256, false)

function collectSceneMatrices(scene: gltf.Scene, mat: aether.Mat4 = aether.mat4.identity(), antiMat: aether.Mat4 = aether.mat4.identity(), matrices: DataTypeOf<typeof matricesStruct>[] = []): DataTypeOf<typeof matricesStruct>[] {
    for (const node of scene.nodes) {
        collectNodeMatrices(node, mat, antiMat, matrices)
    }
    return matrices
}

function collectNodeMatrices(node: gltf.Node, mat: aether.Mat4 = aether.mat4.identity(), antiMat: aether.Mat4 = aether.mat4.identity(), matrices: DataTypeOf<typeof matricesStruct>[] = []): DataTypeOf<typeof matricesStruct>[] {
    const matrix = aether.mat4.mul(mat, node.matrix)
    const antiMatrix = aether.mat4.mul(antiMat, node.antiMatrix)
    if (matrices.length == 0 || !node.isIdentityMatrix && node.meshes.length > 0) {
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
    attributeLocations: Partial<Record<string, number>>, 
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
    const format: GPUIndexFormat = primitive.indices !== null ? asGPUIndexFormat(primitive.indices) : "uint32" 
    return indexBuffer !== null ?
        pass => {
            pass.setPipeline(pipeline);
            primitiveBuffers.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.buffer));
            pass.setIndexBuffer(indexBuffer.buffer, format);
            pass.drawIndexed(primitive.count);
        } :
        pass => {
            pass.setPipeline(pipeline);
            primitiveBuffers.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.buffer));
            pass.draw(primitive.count);
        };
}

function asBufferViewGPUVertexBufferLayoutTuples(primitive: gltf.Primitive, attributeLocations: Partial<Record<string, number>>): [gltf.BufferView, GPUVertexBufferLayout][] {
    const layouts: Map<gltf.BufferView, Map<number, gltf.Accessor>> = new Map();
    for (const attribute of Object.keys(primitive.attributes)) {
        const accessor = primitive.attributes[attribute];
        const location = attributeLocations[attribute];
        if (location !== undefined) {
            const layout = computeIfAbsent(layouts, accessor.bufferView, () => new Map());
            layout.set(location, accessor);
        }
    }

    const attributeCount = [...layouts.values()].map(accessor => accessor.size).reduce((s1, s2) => s1 + s2, 0)
    if (attributeCount < Object.keys(attributeLocations).length) {
        return failure("Defaulting missing attributes is not supported!")
    }

    const bufferLayouts: [gltf.BufferView, GPUVertexBufferLayout][] = [];
    for (const [bufferView, accessors] of layouts.entries()) {
        const stride = bufferView.byteStride != 0 ? bufferView.byteStride : 12 * accessors.size;
        
        const attributes: GPUVertexAttribute[] = [];
        for (const [location, accessor] of accessors.entries()) {
            if (accessor.byteOffset >= stride) {
                return failure("Non-interleaved attributes are not supported!")
            }
            attributes.push({
                format: asGPUVertexFormat(accessor),
                offset: accessor.byteOffset,
                shaderLocation: location,
            });
        }
        attributes.sort((a1, a2) => a1.shaderLocation - a2.shaderLocation)

        bufferLayouts.push([bufferView, {
            arrayStride: stride,
            attributes: attributes,
            stepMode: "vertex",
        }]);
    }
    bufferLayouts.sort(([v1, l1], [v2, l2]) => {
        const [a1] = l1.attributes
        const [a2] = l2.attributes
        return a1.shaderLocation - a2.shaderLocation
    })
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

function asGPUIndexFormat(accessor: gltf.Accessor): GPUIndexFormat {
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
            primitive.indices !== null ? asGPUIndexFormat(primitive.indices) : "uint32" :
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

function computeIfAbsent<K, V, T extends V>(map: Map<K, V>, key: K, computer: (key: K) => T) {
    let result = map.get(key);
    if (result === undefined) {
        result = computer(key);
        map.set(key, result);
    }
    return result;
}

function caching(pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline): (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline {
    const cache = new Map<string, GPURenderPipeline>()
    return (bufferLayouts, primitiveState) => computeIfAbsent(
        cache, 
        digest(bufferLayouts, primitiveState), 
        () => pipelineSupplier(bufferLayouts, primitiveState)
    )
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
