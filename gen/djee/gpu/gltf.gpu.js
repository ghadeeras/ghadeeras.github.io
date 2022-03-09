import { failure } from "../utils.js";
import { mat4x4, struct } from "./types.js";
import { aether } from "/gen/libs.js";
const matricesStruct = struct({
    matrix: mat4x4,
    antiMatrix: mat4x4,
}, ["matrix", "antiMatrix"]).clone(0, 256, false);
export class GPURenderer {
    constructor(model, device, bindGroupIndex, attributeLocations, bindGroupSupplier, pipelineSupplier) {
        this.model = model;
        this.device = device;
        this.resources = [];
        this.nodeRenderers = this.createNodeRenderers(bindGroupIndex, bindGroupSupplier);
        this.primitiveRenderers = this.createPrimitiveRenderers(attributeLocations, caching(pipelineSupplier));
    }
    destroy() {
        var _a;
        while (this.resources.length > 0) {
            (_a = this.resources.pop()) === null || _a === void 0 ? void 0 : _a.destroy();
        }
    }
    createNodeRenderers(bindGroupIndex, bindGroupSupplier) {
        const matrices = collectSceneMatrices(this.model.scene);
        const dataView = matricesStruct.view(matrices);
        const buffer = this.device.buffer(GPUBufferUsage.UNIFORM, dataView, matricesStruct.stride);
        this.resources.push(buffer);
        return createSceneNodeRenderers(this.model.scene, offset => {
            const bindGroup = bindGroupSupplier(buffer, offset);
            return pass => pass.setBindGroup(bindGroupIndex, bindGroup);
        });
    }
    createPrimitiveRenderers(attributeLocations, pipelineSupplier) {
        const buffers = this.gpuBuffers();
        const primitiveRenderers = new Map();
        for (const mesh of this.model.meshes) {
            for (const primitive of mesh.primitives) {
                const renderer = primitiveRenderer(primitive, buffers, attributeLocations, pipelineSupplier);
                primitiveRenderers.set(primitive, renderer);
            }
        }
        return primitiveRenderers;
    }
    gpuBuffers() {
        const buffers = new Map();
        for (const bufferView of this.model.bufferViews) {
            let dataView = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
            if (bufferView.byteStride == 1) {
                const oldBuffer = new Uint8Array(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
                const newBuffer = new Uint16Array(bufferView.byteLength);
                newBuffer.set(oldBuffer);
                dataView = new DataView(newBuffer.buffer);
            }
            const buffer = this.device.buffer(bufferView.index ? GPUBufferUsage.INDEX | GPUBufferUsage.VERTEX : GPUBufferUsage.VERTEX, dataView, bufferView.byteStride);
            buffers.set(bufferView, buffer);
            this.resources.push(buffer);
        }
        return buffers;
    }
    render(pass) {
        var _a;
        const renderer = (_a = this.nodeRenderers.get(this.model.scene)) !== null && _a !== void 0 ? _a : failure("There must be at least a scene renderer!");
        renderer(pass);
        for (const node of this.model.scene.nodes) {
            this.renderNode(pass, node, renderer);
        }
    }
    renderNode(pass, node, parentRenderer) {
        var _a;
        const renderer = (_a = this.nodeRenderers.get(node)) !== null && _a !== void 0 ? _a : parentRenderer;
        if (node.meshes.length > 0) {
            renderer(pass);
        }
        for (const mesh of node.meshes) {
            this.renderMesh(pass, mesh);
        }
        for (const child of node.children) {
            this.renderNode(pass, child, renderer);
        }
    }
    renderMesh(pass, mesh) {
        for (const primitive of mesh.primitives) {
            this.renderPrimitive(pass, primitive);
        }
    }
    renderPrimitive(pass, primitive) {
        var _a;
        const renderer = (_a = this.primitiveRenderers.get(primitive)) !== null && _a !== void 0 ? _a : failure(`No renderer for primitive ${primitive.key}`);
        renderer(pass);
    }
}
function collectSceneMatrices(scene) {
    const matrix = {
        matrix: scene.matrix,
        antiMatrix: aether.mat4.identity()
    };
    const matrices = [matrix];
    for (const node of scene.nodes) {
        collectNodeMatrices(node, false, matrix, matrices);
    }
    return matrices;
}
function collectNodeMatrices(node, parentDirty, parentMatrix, matrices) {
    const matrix = {
        matrix: aether.mat4.mul(parentMatrix.matrix, node.matrix),
        antiMatrix: aether.mat4.mul(parentMatrix.antiMatrix, node.antiMatrix)
    };
    let dirty = parentDirty || !node.isIdentityMatrix;
    if (dirty && node.meshes.length > 0) {
        matrices.push(matrix);
        dirty = false;
    }
    for (const child of node.children) {
        collectNodeMatrices(child, dirty, matrix, matrices);
    }
    return matrices;
}
function createSceneNodeRenderers(scene, rendererForOffset) {
    const map = new Map();
    map.set(scene, rendererForOffset(0));
    for (const node of scene.nodes) {
        createNodeChildRenderers(node, false, rendererForOffset, map);
    }
    return map;
}
function createNodeChildRenderers(node, parentDirty, rendererForOffset, map) {
    let dirty = parentDirty || !node.isIdentityMatrix;
    if (dirty && node.meshes.length > 0) {
        map.set(node, rendererForOffset(map.size * matricesStruct.stride));
        dirty = false;
    }
    for (const child of node.children) {
        createNodeChildRenderers(child, dirty, rendererForOffset, map);
    }
    return map;
}
function primitiveRenderer(primitive, buffers, attributeLocations, pipelineSupplier) {
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
function asIndexBuffer(primitive, buffers) {
    var _a;
    return primitive.indices !== null ?
        {
            gpuBuffer: ((_a = buffers.get(primitive.indices.bufferView)) !== null && _a !== void 0 ? _a : failure("Missing index buffer!")).buffer,
            gpuFormat: gpuIndexFormatOf(primitive.indices),
            offset: primitive.indices.byteOffset
        } : null;
}
function asVertexBuffers(primitive, buffers, attributeLocations) {
    var _a;
    const accessorsByViewsThenLocations = groupAccessorsByViewsThenLocations(primitive, attributeLocations);
    const vertexBuffers = [];
    for (const [bufferView, viewAccessorsByLocation] of accessorsByViewsThenLocations.entries()) {
        const buffer = (_a = buffers.get(bufferView)) !== null && _a !== void 0 ? _a : failure("Missing vertex buffer!");
        const stride = bufferView.byteStride !== 0 ? bufferView.byteStride : byteSizeOf(viewAccessorsByLocation);
        if (areInterleaved(viewAccessorsByLocation, stride)) {
            vertexBuffers.push(interleavedBuffer(buffer, stride, viewAccessorsByLocation));
        }
        else
            for (const [location, accessor] of viewAccessorsByLocation.entries()) {
                vertexBuffers.push(nonInterleavedBuffer(buffer, stride, accessor, location));
            }
    }
    return sortedVertexBuffers(vertexBuffers);
}
function groupAccessorsByViewsThenLocations(primitive, attributeLocations) {
    const accessorsByViewsThenLocations = new Map();
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
function areInterleaved(viewAccessorsByLocation, stride) {
    const accessors = [...viewAccessorsByLocation.values()];
    return accessors.every(accessor => accessor.byteOffset < stride);
}
function interleavedBuffer(buffer, stride, viewAccessorsByLocation) {
    const minOffset = Math.min(...[...viewAccessorsByLocation.values()].map(accessor => accessor.byteOffset));
    const attributes = [];
    for (const [location, accessor] of viewAccessorsByLocation.entries()) {
        attributes.push({
            format: gpuVertexFormatOf(accessor),
            offset: accessor.byteOffset - minOffset,
            shaderLocation: location,
        });
    }
    const vertexBuffer = {
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
function nonInterleavedBuffer(buffer, stride, accessor, location) {
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
function byteSizeOf(viewAccessorsByLocation) {
    return 12 * viewAccessorsByLocation.size;
}
function gpuVertexFormatOf(accessor) {
    switch (accessor.type) {
        case "SCALAR": switch (accessor.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32";
            case WebGL2RenderingContext.INT: return "sint32";
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC2": switch (accessor.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x2";
            case WebGL2RenderingContext.INT: return "sint32x2";
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x2";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC3": switch (accessor.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x3";
            case WebGL2RenderingContext.INT: return "sint32x3";
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x3";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC4": switch (accessor.componentType) {
            case WebGL2RenderingContext.FLOAT: return "float32x4";
            case WebGL2RenderingContext.INT: return "sint32x4";
            case WebGL2RenderingContext.UNSIGNED_INT: return "uint32x4";
            default: return failure("Unsupported accessor type!");
        }
        default: return failure("Unsupported accessor type!");
    }
}
function gpuIndexFormatOf(accessor) {
    switch (accessor.componentType) {
        case WebGL2RenderingContext.UNSIGNED_INT: return "uint32";
        case WebGL2RenderingContext.UNSIGNED_SHORT:
        case WebGL2RenderingContext.UNSIGNED_BYTE: return "uint16";
        default: return failure("Unsupported accessor type!");
    }
}
function asGPUPrimitiveState(primitive) {
    const topology = gpuTopologyOf(primitive);
    return {
        topology: topology,
        stripIndexFormat: topology.endsWith("strip") ?
            primitive.indices !== null ? gpuIndexFormatOf(primitive.indices) : "uint32" :
            undefined
    };
}
function gpuTopologyOf(primitive) {
    switch (primitive.mode) {
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
        .map(l => (Object.assign(Object.assign({}, l), { attributes: [...l.attributes].sort((a1, a2) => a1.shaderLocation - a2.shaderLocation) })))
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