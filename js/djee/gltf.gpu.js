import * as renderer from "./gltf/gltf.renderer.js";
import { gpu } from "lumen";
import { failure } from "./utils.js";
export const gltfMatricesStruct = gpu.struct({
    matrix: gpu.mat4x4,
    antiMatrix: gpu.mat4x4,
}, ["matrix", "antiMatrix"]).clone(0, 256, false);
export function gltfMatrixGroupLayout() {
    return {
        entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                    hasDynamicOffset: true,
                },
            }],
    };
}
export class MatricesResource {
    constructor(group, buffer) {
        this.group = group;
        this.buffer = buffer;
    }
    destroy() {
        this.buffer.destroy();
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
export class GPURendererFactory {
    constructor(device, matricesGroupIndex, attributeLocations, pipelineSupplier) {
        this.adapter = new GPUAdapter(device, device.device.createBindGroupLayout(gltfMatrixGroupLayout()), matricesGroupIndex, attributeLocations, caching(pipelineSupplier));
    }
    newInstance(model) {
        return new renderer.GLTFRenderer(model, this.adapter);
    }
    get matricesGroupLayout() {
        return this.adapter.matricesGroupLayout;
    }
}
class GPUAdapter {
    constructor(device, matricesGroupLayout, matricesGroupIndex, attributeLocations, pipelineSupplier) {
        this.device = device;
        this.matricesGroupLayout = matricesGroupLayout;
        this.matricesGroupIndex = matricesGroupIndex;
        this.attributeLocations = attributeLocations;
        this.pipelineSupplier = pipelineSupplier;
    }
    matricesBuffer(matrices) {
        const dataView = gltfMatricesStruct.view(matrices);
        const buffer = this.device.dataBuffer({
            label: "matrices",
            usage: ["UNIFORM"],
            data: dataView
        });
        const group = this.device.device.createBindGroup({
            layout: this.matricesGroupLayout,
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: buffer.wrapped,
                        size: gltfMatricesStruct.paddedSize,
                    }
                }]
        });
        return new MatricesResource(group, buffer);
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
    matrixBinder(matrixBuffer, index) {
        return pass => pass.setBindGroup(this.matricesGroupIndex, matrixBuffer.group, [index * gltfMatricesStruct.stride]);
    }
    primitiveBinder(count, mode, attributes, index = null) {
        const topology = toGpuTopology(mode);
        const indexFormat = index !== null ? toGpuIndexFormat(index.componentType) : "uint32";
        const vertexBufferSlots = asVertexBufferSlots(attributes, this.attributeLocations);
        const bufferLayouts = vertexBufferSlots.map(b => b.gpuLayout);
        const primitiveState = {
            topology: topology,
            stripIndexFormat: topology.endsWith("strip") ? indexFormat : undefined
        };
        const pipeline = this.pipelineSupplier(bufferLayouts, primitiveState);
        return index !== null ?
            pass => {
                pass.setPipeline(pipeline);
                vertexBufferSlots.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.gpuBuffer, buffer.offset));
                pass.setIndexBuffer(index.buffer.wrapped, indexFormat, index.offset);
                pass.drawIndexed(count);
            } :
            pass => {
                pass.setPipeline(pipeline);
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
    return (bufferLayouts, primitiveState) => computeIfAbsent(cache, digest(bufferLayouts), () => pipelineSupplier(bufferLayouts, primitiveState));
}
function computeIfAbsent(map, key, computer) {
    let result = map.get(key);
    if (result === undefined) {
        result = computer(key);
        map.set(key, result);
    }
    return result;
}
function digest(bufferLayouts) {
    return [...bufferLayouts]
        .map(l => ({
        ...l,
        attributes: [...l.attributes].sort((a1, a2) => a1.shaderLocation - a2.shaderLocation)
    }))
        .sort((l1, l2) => l1.attributes[0].shaderLocation - l2.attributes[0].shaderLocation)
        .reduce((s, l, i) => s + (i > 0 ? "|" : "") + digestLayout(l), "[") + "]";
}
function digestLayout(l) {
    return "{" + l.arrayStride + ":" + [...l.attributes].reduce((s, a, i) => s + (i > 0 ? "|" : "") + digestAttribute(a), "[") + "]}";
}
function digestAttribute(a) {
    return "{" + a.shaderLocation + ":" + a.offset + ":" + a.format + "}";
}
//# sourceMappingURL=gltf.gpu.js.map