import * as renderer from "./gltf/gltf.renderer.js";
import { gpu } from "lumen";
import { failure } from "./utils.js";
export const gltfMatricesStruct = gpu.struct({
    matrix: gpu.mat4x4,
    antiMatrix: gpu.mat4x4,
}, ["matrix", "antiMatrix"]).clone(0, 256, false);
export const gltfMaterialsStruct = gpu.struct({
    baseColorFactor: gpu.f32.x4,
    metallicFactor: gpu.f32,
    roughnessFactor: gpu.f32,
    emissiveFactor: gpu.f32.x3,
    alphaCutoff: gpu.f32
}).clone(0, 256, false);
export function layouts(device) {
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
    });
}
export class NodeLevelResources {
    constructor(group, matricesBuffer) {
        this.group = group;
        this.matricesBuffer = matricesBuffer;
    }
    destroy() {
        this.matricesBuffer.destroy();
    }
}
export class VertexBuffer {
    constructor(data, stride) {
        this.data = data;
        this.stride = stride;
    }
    destroy() {
        this.data.destroy();
    }
}
class PrimitiveLevelResources {
    constructor(groups, materialsBuffer, doubleSided) {
        this.groups = groups;
        this.materialsBuffer = materialsBuffer;
        this.doubleSided = doubleSided;
    }
    destroy() {
        this.materialsBuffer.destroy();
    }
}
export class GPURendererFactory {
    constructor(device, matricesGroupIndex, materialsGroupIndex, attributeLocations, pipelineSupplier) {
        const l = layouts(device);
        this.adapter = new GPUAdapter(device, l.node, l.material, matricesGroupIndex, materialsGroupIndex, attributeLocations, caching(pipelineSupplier));
    }
    async newInstance(model) {
        return await renderer.GLTFRenderer.create(model, this.adapter);
    }
    get matricesGroupLayout() {
        return this.adapter.matricesGroupLayout.wrapped;
    }
    get materialsGroupLayout() {
        return this.adapter.materialsGroupLayout.wrapped;
    }
}
class GPUAdapter {
    constructor(device, matricesGroupLayout, materialsGroupLayout, matricesGroupIndex, materialsGroupIndex, attributeLocations, pipelineSupplier) {
        this.device = device;
        this.matricesGroupLayout = matricesGroupLayout;
        this.materialsGroupLayout = materialsGroupLayout;
        this.matricesGroupIndex = matricesGroupIndex;
        this.materialsGroupIndex = materialsGroupIndex;
        this.attributeLocations = attributeLocations;
        this.pipelineSupplier = pipelineSupplier;
    }
    nodeLevelResources(matrices) {
        const dataView = gltfMatricesStruct.view(matrices);
        const buffer = this.device.dataBuffer({
            label: "matrices",
            usage: ["UNIFORM"],
            data: dataView
        });
        const group = this.matricesGroupLayout.bindGroup({
            matrices: buffer.view({ size: gltfMatricesStruct.paddedSize })
        }, "nodeLevelResources");
        return new NodeLevelResources(group.wrapped, buffer);
    }
    primitiveLevelResources(materials) {
        const dataView = gltfMaterialsStruct.view(materials.map(m => ({
            ...m,
            alphaCutoff: m.alphaMode === "OPAQUE" ? 0.0
                : m.alphaMode === "BLEND" ? 2.0
                    : m.alphaCutoff
        })));
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
        return new PrimitiveLevelResources(groups, buffer, materials.map(m => m.doubleSided));
    }
    vertexBuffer(dataView, stride) {
        return new VertexBuffer(this.device.dataBuffer({
            label: "vertex",
            usage: ["VERTEX"],
            data: dataView
        }), stride);
    }
    indexBuffer(dataView, stride) {
        return this.device.dataBuffer({
            label: "index",
            usage: ["INDEX", "VERTEX"],
            data: this.adapt(dataView, stride)
        });
    }
    texture(imageBitmap, linear) {
        const texture = this.device.texture({
            size: [imageBitmap.width, imageBitmap.height],
            format: linear ? "rgba8unorm" : "rgba8unorm-srgb",
            viewFormats: ["rgba8unorm-srgb", "rgba8unorm"],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.device.wrapped.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: texture.wrapped }, [imageBitmap.width, imageBitmap.height]);
        texture.generateMipmaps();
        return texture;
    }
    sampler(sampler) {
        return this.device.sampler({
            magFilter: filterMode(sampler.magFilter),
            minFilter: filterMode(sampler.minFilter),
            mipmapFilter: mipmapMode(sampler.minFilter),
            addressModeU: addressMode(sampler.wrapS),
            addressModeV: addressMode(sampler.wrapT),
        });
    }
    nodeLevelBinder(matrixBuffer, index) {
        const offsets = [index * gltfMatricesStruct.stride];
        return pass => pass.setBindGroup(this.matricesGroupIndex, matrixBuffer.group, offsets);
    }
    primitiveLevelRenderingRoutine(count, mode, resources, materialIndex, attributes, index = null) {
        const topology = toGpuTopology(mode);
        const indexFormat = index !== null ? toGpuIndexFormat(index.componentType) : "uint32";
        const vertexBufferSlots = asVertexBufferSlots(attributes, this.attributeLocations);
        const bufferLayouts = vertexBufferSlots.map(b => b.gpuLayout);
        const primitiveState = {
            topology: topology,
            stripIndexFormat: topology.endsWith("strip") ? indexFormat : undefined,
            cullMode: resources.doubleSided[materialIndex] ? "none" : "back"
        };
        const pipeline = this.pipelineSupplier(bufferLayouts, primitiveState);
        const group = resources.groups[materialIndex];
        return index !== null ?
            pass => {
                pass.setPipeline(pipeline);
                pass.setBindGroup(this.materialsGroupIndex, group);
                vertexBufferSlots.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.gpuBuffer, buffer.offset));
                pass.setIndexBuffer(index.buffer.wrapped, indexFormat, index.offset);
                pass.drawIndexed(count);
            } :
            pass => {
                pass.setPipeline(pipeline);
                pass.setBindGroup(this.materialsGroupIndex, group);
                vertexBufferSlots.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.gpuBuffer, buffer.offset));
                pass.draw(count);
            };
    }
    adapt(dataView, stride) {
        if (stride == 1) {
            const oldBuffer = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
            const newBuffer = new Uint16Array(dataView.byteLength);
            newBuffer.set(oldBuffer);
            dataView = new DataView(newBuffer.buffer);
        }
        return dataView;
    }
}
function asVertexBufferSlots(attributes, attributeLocations) {
    const attributesByBuffersThenLocations = groupAttributesByBuffersThenLocations(attributes, attributeLocations);
    const vertexBufferSlots = [];
    for (const [buffer, bufferAttributesByLocation] of attributesByBuffersThenLocations.entries()) {
        const baseOffset = baseOffsetOf(bufferAttributesByLocation);
        if (areInterleaved(buffer.stride, baseOffset, bufferAttributesByLocation)) {
            vertexBufferSlots.push(interleavedBuffer(buffer, baseOffset, bufferAttributesByLocation));
        }
        else
            for (const [location, attribute] of bufferAttributesByLocation.entries()) {
                vertexBufferSlots.push(nonInterleavedBuffer(buffer, attribute, location));
            }
    }
    return sortedVertexBuffers(vertexBufferSlots);
}
function groupAttributesByBuffersThenLocations(attributes, attributeLocations) {
    const accessorsByBuffersThenLocations = new Map();
    for (const attribute of attributes) {
        const location = attributeLocations[attribute.name];
        if (location !== undefined) {
            const attributesByLocations = computeIfAbsent(accessorsByBuffersThenLocations, attribute.buffer, () => new Map());
            attributesByLocations.set(location, attribute);
        }
    }
    return accessorsByBuffersThenLocations;
}
function areInterleaved(stride, baseOffset, bufferAttributesByLocation) {
    const attributes = [...bufferAttributesByLocation.values()];
    return attributes.every(attribute => (attribute.offset - baseOffset) < stride);
}
function interleavedBuffer(buffer, baseOffset, attributesByLocation) {
    const attributes = [];
    for (const [location, attribute] of attributesByLocation.entries()) {
        attributes.push({
            format: gpuVertexFormatOf(attribute),
            offset: attribute.offset - baseOffset,
            shaderLocation: location,
        });
    }
    const vertexBuffer = {
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
function baseOffsetOf(attributesByLocation) {
    return Math.min(...[...attributesByLocation.values()].map(attribute => attribute.offset));
}
function nonInterleavedBuffer(buffer, attribute, location) {
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
function sortedVertexBuffers(vertexBuffers) {
    return vertexBuffers.map(b => {
        b.gpuLayout.attributes = [...b.gpuLayout.attributes].sort((a1, a2) => a1.shaderLocation - a2.shaderLocation);
        return b;
    }).sort((b1, b2) => {
        const [a1] = b1.gpuLayout.attributes;
        const [a2] = b2.gpuLayout.attributes;
        return a1.shaderLocation - a2.shaderLocation;
    });
}
function gpuVertexFormatOf(attribute) {
    switch (attribute.type) {
        case "SCALAR": switch (attribute.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32";
            case WebGL2RenderingContext.INT: return "sint32";
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC2": switch (attribute.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x2";
            case WebGL2RenderingContext.INT: return "sint32x2";
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x2";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC3": switch (attribute.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x3";
            case WebGL2RenderingContext.INT: return "sint32x3";
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x3";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC4": switch (attribute.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x4";
            case WebGL2RenderingContext.INT: return "sint32x4";
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x4";
            default: return failure("Unsupported accessor type!");
        }
        default: return failure("Unsupported accessor type!");
    }
}
function toGpuIndexFormat(componentType) {
    switch (componentType) {
        case WebGL2RenderingContext.UNSIGNED_INT: return "uint32";
        case WebGL2RenderingContext.UNSIGNED_SHORT:
        case WebGL2RenderingContext.UNSIGNED_BYTE: return "uint16";
        default: return failure("Unsupported accessor type!");
    }
}
function toGpuTopology(primitiveMode) {
    switch (primitiveMode) {
        case WebGL2RenderingContext.TRIANGLES: return "triangle-list";
        case WebGL2RenderingContext.TRIANGLE_STRIP: return "triangle-strip";
        case WebGL2RenderingContext.LINES: return "line-list";
        case WebGL2RenderingContext.LINE_STRIP: return "line-strip";
        case WebGL2RenderingContext.POINTS: return "point-list";
        default: return failure("Unsupported primitive mode!");
    }
}
function caching(pipelineSupplier) {
    const cache = new Map();
    return (bufferLayouts, primitiveState) => computeIfAbsent(cache, digest(bufferLayouts, primitiveState), () => pipelineSupplier(bufferLayouts, primitiveState));
}
function computeIfAbsent(map, key, computer) {
    let result = map.get(key);
    if (result === undefined) {
        result = computer(key);
        map.set(key, result);
    }
    return result;
}
function digest(bufferLayouts, primitiveState) {
    return [...bufferLayouts]
        .map(l => ({
        ...l,
        attributes: [...l.attributes].sort((a1, a2) => a1.shaderLocation - a2.shaderLocation)
    }))
        .sort((l1, l2) => l1.attributes[0].shaderLocation - l2.attributes[0].shaderLocation)
        .reduce((s, l, i) => s + (i > 0 ? "|" : "") + digestLayout(l), "[") + "]"
        +
            `[${primitiveState.topology ?? ""}|${primitiveState.stripIndexFormat ?? ""}|${primitiveState.cullMode ?? ""}|]`;
}
function digestLayout(l) {
    return "{" + l.arrayStride + ":" + [...l.attributes].reduce((s, a, i) => s + (i > 0 ? "|" : "") + digestAttribute(a), "[") + "]}";
}
function digestAttribute(a) {
    return "{" + a.shaderLocation + ":" + a.offset + ":" + a.format + "}";
}
function filterMode(filter) {
    switch (filter) {
        case WebGL2RenderingContext.NEAREST:
        case WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST:
        case WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST: return "nearest";
        default: return "linear";
    }
}
function mipmapMode(filter) {
    switch (filter) {
        case WebGL2RenderingContext.NEAREST:
        case WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST:
        case WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR: return "nearest";
        default: return "nearest";
    }
}
function addressMode(wrap) {
    switch (wrap) {
        case WebGL2RenderingContext.CLAMP_TO_EDGE: return "clamp-to-edge";
        case WebGL2RenderingContext.MIRRORED_REPEAT: return "mirror-repeat";
        default: return "repeat";
    }
}
//# sourceMappingURL=gltf.gpu.js.map