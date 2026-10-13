import * as gltf from "./gltf/gltf.js";
import * as graph from "./gltf/gltf.graph.js";
import * as renderer from "./gltf/gltf.renderer.js";
import { gpu } from "lumen";
import { Resource } from "lumen";
import { failure } from "./utils.js";

export const gltfMatricesStruct = gpu.struct({
    matrix: gpu.mat4x4,
    antiMatrix: gpu.mat4x4,
}, ["matrix", "antiMatrix"]).clone(0, 256, false)

export const gltfMaterialsStruct = gpu.struct({
    baseColorFactor: gpu.f32.x4,
    metallicFactor: gpu.f32,
    roughnessFactor: gpu.f32,
    emissiveFactor: gpu.f32.x3,
    alphaCutoff: gpu.f32
}).clone(0, 256, false)

export function layouts(device: gpu.Device) {
    return device.groupLayouts({
        node: {
            matrices: gpu.uniform(gltfMatricesStruct, true).asEntry(0, "VERTEX", "FRAGMENT")
        },
        material: {
            uniform: gpu.uniform(gltfMaterialsStruct).asEntry(0, "FRAGMENT"),
            baseColorTexture: gpu.texture_2d("float").asEntry(1, "FRAGMENT"),
            baseColorSampler: gpu.sampler("filtering").asEntry(2, "FRAGMENT"),
            metallicRoughnessTexture: gpu.texture_2d("float").asEntry(3, "FRAGMENT"),
            metallicRoughnessSampler: gpu.sampler("filtering").asEntry(4, "FRAGMENT"),
            emissiveFactorTexture: gpu.texture_2d("float").asEntry(5, "FRAGMENT"),
            emissiveFactorSampler: gpu.sampler("filtering").asEntry(6, "FRAGMENT"),
            occlusionTexture: gpu.texture_2d("float").asEntry(7, "FRAGMENT"),
            occlusionSampler: gpu.sampler("filtering").asEntry(8, "FRAGMENT"),
            normalTexture: gpu.texture_2d("float").asEntry(9, "FRAGMENT"),
            normalSampler: gpu.sampler("filtering").asEntry(10, "FRAGMENT"),
        }
    })
}

export class NodeLevelResources implements Resource {
    
    constructor(readonly group: GPUBindGroup, readonly matricesBuffer: gpu.DataBuffer) {}

    destroy(): void {
        this.matricesBuffer.destroy()
    }

}

export class VertexBuffer implements Resource {

    constructor(readonly data: gpu.DataBuffer, readonly stride: number) {}

    destroy(): void {
        this.data.destroy();
    }

}

class PrimitiveLevelResources implements Resource {

    constructor(readonly groups: GPUBindGroup[], readonly materialsBuffer: gpu.DataBuffer, readonly doubleSided: boolean[]) {}

    destroy(): void {
        this.materialsBuffer.destroy()
    }

}

export class GPURendererFactory {
    
    private adapter: GPUAdapter

    constructor(
        device: gpu.Device, 
        matricesGroupIndex: number,
        materialsGroupIndex: number,
        attributeLocations: Partial<Record<renderer.VertexAttribute<any>["name"], number>>, 
        pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ) {
        const l = layouts(device)
        this.adapter = new GPUAdapter(
            device, 
            l.node, 
            l.material, 
            matricesGroupIndex, 
            materialsGroupIndex,
            attributeLocations, 
            caching(pipelineSupplier)
        )
    }

    async newInstance(model: graph.Model): Promise<renderer.GLTFRenderer<NodeLevelResources, PrimitiveLevelResources, gpu.Texture, gpu.Sampler, VertexBuffer, gpu.DataBuffer, GPURenderPassEncoder>> {
        return await renderer.GLTFRenderer.create(model, this.adapter)
    }

    get matricesGroupLayout(): GPUBindGroupLayout {
        return this.adapter.matricesGroupLayout.wrapped
    }

    get materialsGroupLayout(): GPUBindGroupLayout {
        return this.adapter.materialsGroupLayout.wrapped
    }

}

class GPUAdapter implements renderer.APIAdapter<NodeLevelResources, PrimitiveLevelResources, gpu.Texture, gpu.Sampler, VertexBuffer, gpu.DataBuffer, GPURenderPassEncoder> {

    constructor(
        private device: gpu.Device, 
        readonly matricesGroupLayout: ReturnType<typeof layouts>["node"],
        readonly materialsGroupLayout: ReturnType<typeof layouts>["material"],
        private matricesGroupIndex: number,
        private materialsGroupIndex: number,
        private attributeLocations: Partial<Record<string, number>>, 
        private pipelineSupplier: (bufferLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState) => GPURenderPipeline,
    ) {}

    nodeLevelResources(matrices: renderer.Matrix[]): NodeLevelResources {
        const dataView = gltfMatricesStruct.view(matrices)
        const buffer = this.device.dataBuffer({
            label: "matrices",
            usage: ["UNIFORM"],
            data: dataView
        });
        const group = this.matricesGroupLayout.bindGroup({
            matrices: buffer.view({ size: gltfMatricesStruct.paddedSize })
        }, "nodeLevelResources");
        return new NodeLevelResources(group.wrapped, buffer)
    }

    primitiveLevelResources(materials: renderer.Material<gpu.Texture, gpu.Sampler>[]): PrimitiveLevelResources {
        const dataView = gltfMaterialsStruct.view(materials.map(m => ({
            ...m,
            alphaCutoff: 
                  m.alphaMode === "OPAQUE" ? 0.0
                : m.alphaMode === "BLEND" ? 2.0
                : m.alphaCutoff
        })))
        const buffer = this.device.dataBuffer({
            label: "materials",
            usage: ["UNIFORM"],
            data: dataView
        });
        const groups = materials.map((m, i) => this.materialsGroupLayout.bindGroup({
            uniform: buffer.view({ size: gltfMaterialsStruct.paddedSize, offset: i * gltfMaterialsStruct.stride }),
            baseColorTexture: m.baseColorTexture[0].createView({ format: "rgba8unorm" }),
            baseColorSampler: m.baseColorTexture[1],
            metallicRoughnessTexture: m.metallicRoughnessTexture[0].createView({ format: "rgba8unorm" }),
            metallicRoughnessSampler: m.metallicRoughnessTexture[1],
            emissiveFactorTexture: m.emissiveTexture[0].createView({ format: "rgba8unorm" }),
            emissiveFactorSampler: m.emissiveTexture[1],
            occlusionTexture: m.occlusionTexture[0].createView({ format: "rgba8unorm" }),
            occlusionSampler: m.occlusionTexture[1],
            normalTexture: m.normalTexture[0].createView({ format: "rgba8unorm" }),
            normalSampler: m.normalTexture[1],
        }, `material${i}`).wrapped);
        return new PrimitiveLevelResources(groups, buffer, materials.map(m => m.doubleSided))
    }

    vertexBuffer(dataView: DataView, stride: number): VertexBuffer {
        return new VertexBuffer(this.device.dataBuffer({
            label: "vertex",
            usage: ["VERTEX"],
            data: dataView
        }), stride)
    }

    indexBuffer(dataView: DataView, stride: number): gpu.DataBuffer {
        return this.device.dataBuffer({
            label: "index",
            usage: ["INDEX", "VERTEX"], 
            data: this.adapt(dataView, stride)
        })
    }

    texture(imageBitmap: ImageBitmap, linear: boolean): gpu.Texture {
        const texture = this.device.texture({
            size: [imageBitmap.width, imageBitmap.height],
            format: linear ? "rgba8unorm" : "rgba8unorm-srgb",
            viewFormats: ["rgba8unorm-srgb", "rgba8unorm"],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        })
        this.device.wrapped.queue.copyExternalImageToTexture(
            { source: imageBitmap }, 
            { texture: texture.wrapped }, 
            [ imageBitmap.width, imageBitmap.height ]
        )
        texture.generateMipmaps()
        return texture
    }

    sampler(sampler: graph.Sampler): gpu.Sampler {
        return this.device.sampler({
            magFilter: filterMode(sampler.magFilter),
            minFilter: filterMode(sampler.minFilter),
            mipmapFilter: mipmapMode(sampler.minFilter),
            addressModeU: addressMode(sampler.wrapS),
            addressModeV: addressMode(sampler.wrapT),
        })
    }

    nodeLevelBinder(matrixBuffer: NodeLevelResources, index: number): renderer.RenderingRoutine<GPURenderPassEncoder> {
        const offsets = [index * gltfMatricesStruct.stride]
        return pass => pass.setBindGroup(this.matricesGroupIndex, matrixBuffer.group, offsets)
    }

    primitiveLevelRenderingRoutine(
        count: number, 
        mode: gltf.PrimitiveMode, 
        resources: PrimitiveLevelResources,
        materialIndex: number, 
        attributes: renderer.VertexAttribute<VertexBuffer>[], 
        index: renderer.Index<gpu.DataBuffer> | null = null
    ): renderer.RenderingRoutine<GPURenderPassEncoder> {
        const topology = toGpuTopology(mode)
        const indexFormat: GPUIndexFormat = index !== null ? toGpuIndexFormat(index.componentType) : "uint32"
        const vertexBufferSlots = asVertexBufferSlots(attributes, this.attributeLocations);
        
        const bufferLayouts = vertexBufferSlots.map(b => b.gpuLayout);
        const primitiveState = {
            topology: topology,
            stripIndexFormat: topology.endsWith("strip") ? indexFormat : undefined,
            cullMode: resources.doubleSided[materialIndex] ? "none" : "back"
        } as const
        const pipeline = this.pipelineSupplier(bufferLayouts, primitiveState);
        
        const group = resources.groups[materialIndex]
        return index !== null ?
            pass => {
                pass.setPipeline(pipeline);
                pass.setBindGroup(this.materialsGroupIndex, group)
                vertexBufferSlots.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.gpuBuffer, buffer.offset));
                pass.setIndexBuffer(index.buffer.wrapped, indexFormat, index.offset);
                pass.drawIndexed(count);
            } :
            pass => {
                pass.setPipeline(pipeline);
                pass.setBindGroup(this.materialsGroupIndex, group)
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

function asVertexBufferSlots(attributes: renderer.VertexAttribute<VertexBuffer>[], attributeLocations: Partial<Record<string, number>>): VertexBufferSlot[] {
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

function groupAttributesByBuffersThenLocations(attributes: renderer.VertexAttribute<VertexBuffer>[], attributeLocations: Partial<Record<string, number>>): Map<VertexBuffer, Map<number, renderer.VertexAttribute<VertexBuffer>>> {
    const accessorsByBuffersThenLocations: Map<VertexBuffer, Map<number, renderer.VertexAttribute<VertexBuffer>>> = new Map();
    for (const attribute of attributes) {
        const location = attributeLocations[attribute.name];
        if (location !== undefined) {
            const attributesByLocations = computeIfAbsent(accessorsByBuffersThenLocations, attribute.buffer, () => new Map()); 
            attributesByLocations.set(location, attribute);
        }
    }
    return accessorsByBuffersThenLocations;
}

function areInterleaved(stride: number, baseOffset: number, bufferAttributesByLocation: Map<number, renderer.VertexAttribute<VertexBuffer>>) {
    const attributes = [...bufferAttributesByLocation.values()];
    return attributes.every(attribute => (attribute.offset - baseOffset) < stride);
}

function interleavedBuffer(buffer: VertexBuffer, baseOffset: number, attributesByLocation: Map<number, renderer.VertexAttribute<VertexBuffer>>) {
    const attributes: GPUVertexAttribute[] = [];
    for (const [location, attribute] of attributesByLocation.entries()) {
        attributes.push({
            format: gpuVertexFormatOf(attribute),
            offset: attribute.offset - baseOffset,
            shaderLocation: location,
        });
    }

    const vertexBuffer: VertexBufferSlot = {
        gpuBuffer: buffer.data.wrapped,
        offset: baseOffset,
        gpuLayout: {
            arrayStride: buffer.stride,
            attributes: attributes,
            stepMode: "vertex",
        }
    };
    return vertexBuffer;
}

function baseOffsetOf(attributesByLocation: Map<number, renderer.VertexAttribute<VertexBuffer>>) {
    return Math.min(...[...attributesByLocation.values()].map(attribute => attribute.offset));
}

function nonInterleavedBuffer(buffer: VertexBuffer, attribute: renderer.VertexAttribute<VertexBuffer>, location: number): VertexBufferSlot {
    return {
        gpuBuffer: buffer.data.wrapped,
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

function gpuVertexFormatOf(attribute: renderer.VertexAttribute<VertexBuffer>): GPUVertexFormat {
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
        +
        `[${primitiveState.topology ?? ""}|${primitiveState.stripIndexFormat ?? ""}|${primitiveState.cullMode ?? ""}|]`
}

function digestLayout(l: GPUVertexBufferLayout) {
    return "{" + l.arrayStride + ":" + [...l.attributes].reduce((s, a, i) => s + (i > 0 ? "|" : "") + digestAttribute(a), "[") + "]}"
}

function digestAttribute(a: GPUVertexAttribute) {
    return "{" + a.shaderLocation + ":" + a.offset + ":" + a.format + "}"
}

function filterMode(filter: number): GPUFilterMode {
    switch (filter) {
        case WebGL2RenderingContext.NEAREST:
        case WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST:
        case WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST: return "nearest"
        default: return "linear"
    }
}

function mipmapMode(filter: number): GPUMipmapFilterMode {
    switch (filter) {
        case WebGL2RenderingContext.NEAREST:
        case WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST:
        case WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR: return "nearest"
        default: return "nearest"
    }
}

function addressMode(wrap: number): GPUAddressMode {
    switch (wrap) {
        case WebGL2RenderingContext.CLAMP_TO_EDGE: return "clamp-to-edge"
        case WebGL2RenderingContext.MIRRORED_REPEAT: return "mirror-repeat"
        default: return "repeat"
    }
}
