import { failure } from "../utils";
import { mat4x4, struct } from "./types.js";
import { aether } from "/gen/libs.js";
export class GPURenderer {
    constructor(model, device, bindGroupIndex, attributeLocations, bindGroupSupplier, pipelineSupplier) {
        this.model = model;
        this.nodeRenderers = this.createNodeRenderers(device, bindGroupIndex, bindGroupSupplier);
        this.primitiveRenderers = this.createPrimitiveRenderers(device, attributeLocations, pipelineSupplier);
    }
    createNodeRenderers(device, bindGroupIndex, bindGroupSupplier) {
        const matrices = collectSceneMatrices(this.model.scene);
        const dataView = matricesStruct.view(matrices);
        const buffer = device.buffer(GPUBufferUsage.UNIFORM, dataView, matricesStruct.stride);
        return this.createSceneNodeRenderers((node, offset) => {
            const bindGroup = bindGroupSupplier(buffer, offset);
            this.nodeRenderers.set(node, pass => pass.setBindGroup(bindGroupIndex, bindGroup));
        });
    }
    createSceneNodeRenderers(adder, map = new Map()) {
        for (const node of this.model.scene.nodes) {
            this.createNodeChildRenderers(node, adder, map);
        }
        return map;
    }
    createNodeChildRenderers(node, adder, map = new Map()) {
        if (node.meshes.length > 0) {
            adder(node, matricesStruct.paddedSize * this.nodeRenderers.size);
        }
        for (const child of node.children) {
            this.createNodeChildRenderers(child, adder, map);
        }
        return map;
    }
    createPrimitiveRenderers(device, attributeLocations, pipelineSupplier) {
        const buffers = this.gpuBuffers(device);
        const primitiveRenderers = new Map();
        for (const mesh of this.model.meshes) {
            for (const primitive of mesh.primitives) {
                const renderer = primitiveRenderer(primitive, buffers, attributeLocations, pipelineSupplier);
                primitiveRenderers.set(primitive, renderer);
            }
        }
        return primitiveRenderers;
    }
    gpuBuffers(device) {
        const buffers = new Map();
        for (const bufferView of this.model.bufferViews) {
            buffers.set(bufferView, device.buffer(bufferView.index ? GPUBufferUsage.INDEX : GPUBufferUsage.VERTEX, new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength), bufferView.byteStride));
        }
        return buffers;
    }
    render(pass) {
        for (const node of this.model.scene.nodes) {
            this.renderNode(pass, node);
        }
    }
    renderNode(pass, node) {
        const renderer = this.nodeRenderers.get(node);
        if (renderer !== undefined) {
            renderer(pass);
            for (const mesh of node.meshes) {
                this.renderMesh(pass, mesh);
            }
        }
        for (const child of node.children) {
            this.renderNode(pass, child);
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
const matricesStruct = struct({
    matrix: mat4x4,
    antiMatrix: mat4x4,
}, ["matrix", "antiMatrix"]);
function collectSceneMatrices(scene, mat = aether.mat4.identity(), antiMat = aether.mat4.identity(), matrices = []) {
    for (const node of scene.nodes) {
        collectNodeMatrices(node, mat, antiMat, matrices);
    }
    return matrices;
}
function collectNodeMatrices(node, mat = aether.mat4.identity(), antiMat = aether.mat4.identity(), matrices = []) {
    const matrix = aether.mat4.mul(mat, node.matrix);
    const antiMatrix = aether.mat4.mul(antiMat, node.antiMatrix);
    if (node.meshes.length > 0) {
        matrices.push({ matrix, antiMatrix });
    }
    for (const child of node.children) {
        collectNodeMatrices(child, matrix, antiMatrix, matrices);
    }
    return matrices;
}
function primitiveRenderer(primitive, buffers, attributeLocations, pipelineSupplier) {
    var _a;
    const viewLayoutTuples = asBufferViewGPUVertexBufferLayoutTuples(primitive, attributeLocations);
    const primitiveState = asGPUPrimitiveState(primitive);
    const bufferLayouts = viewLayoutTuples.map(([view, layout]) => layout);
    const primitiveBuffers = viewLayoutTuples.map(([view, layout]) => { var _a; return (_a = buffers.get(view)) !== null && _a !== void 0 ? _a : failure("Missing vertex buffer!"); });
    const pipeline = pipelineSupplier(bufferLayouts, primitiveState);
    const indexBuffer = primitive.indices !== null ?
        (_a = buffers.get(primitive.indices.bufferView)) !== null && _a !== void 0 ? _a : failure("Missing index buffer!") :
        null;
    return indexBuffer !== null ?
        pass => {
            var _a;
            pass.setPipeline(pipeline);
            primitiveBuffers.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.buffer));
            pass.setIndexBuffer(indexBuffer.buffer, (_a = primitiveState.stripIndexFormat) !== null && _a !== void 0 ? _a : "uint32");
            pass.drawIndexed(primitive.count);
        } :
        pass => {
            pass.setPipeline(pipeline);
            primitiveBuffers.forEach((buffer, slot) => pass.setVertexBuffer(slot, buffer.buffer));
            pass.draw(primitive.count);
        };
}
function asBufferViewGPUVertexBufferLayoutTuples(primitive, attributeLocations) {
    const layouts = new Map();
    for (const attribute of Object.keys(primitive.attributes)) {
        const accessor = primitive.attributes[attribute];
        const location = attributeLocations[attribute];
        const layout = computeIfAbsent(layouts, accessor.bufferView, () => new Map());
        layout.set(location, accessor);
    }
    const bufferLayouts = [];
    for (const [bufferView, accessors] of layouts.entries()) {
        const attributes = [];
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
function asGPUVertexFormat(accessor) {
    switch (accessor.type) {
        case "SCALAR": switch (accessor.componentType) {
            case WebGLRenderingContext.FLOAT: return "float32";
            case WebGLRenderingContext.INT: return "sint32";
            case WebGLRenderingContext.UNSIGNED_INT: return "uint32";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC2": switch (accessor.componentType) {
            case WebGLRenderingContext.FLOAT: return "float32x2";
            case WebGLRenderingContext.INT: return "sint32x2";
            case WebGLRenderingContext.UNSIGNED_INT: return "uint32x2";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC3": switch (accessor.componentType) {
            case WebGLRenderingContext.FLOAT: return "float32x3";
            case WebGLRenderingContext.INT: return "sint32x3";
            case WebGLRenderingContext.UNSIGNED_INT: return "uint32x3";
            default: return failure("Unsupported accessor type!");
        }
        case "VEC4": switch (accessor.componentType) {
            case WebGLRenderingContext.FLOAT: return "float32x4";
            case WebGLRenderingContext.INT: return "sint32x4";
            case WebGLRenderingContext.UNSIGNED_INT: return "uint32x4";
            default: return failure("Unsupported accessor type!");
        }
        default: return failure("Unsupported accessor type!");
    }
}
function asGPUindexFormat(accessor) {
    switch (accessor.componentType) {
        case WebGLRenderingContext.UNSIGNED_INT: return "uint32";
        case WebGLRenderingContext.UNSIGNED_SHORT: return "uint16";
        default: return failure("Unsupported accessor type!");
    }
}
function asGPUPrimitiveState(primitive) {
    const topology = asGPUPrimitiveTopology(primitive.mode);
    return {
        topology: topology,
        stripIndexFormat: topology.endsWith("strip") ?
            primitive.indices !== null ? asGPUindexFormat(primitive.indices) : "uint32" :
            undefined
    };
}
function asGPUPrimitiveTopology(mode) {
    switch (mode) {
        case WebGLRenderingContext.TRIANGLES: return "triangle-list";
        case WebGLRenderingContext.TRIANGLE_STRIP: return "triangle-strip";
        case WebGLRenderingContext.LINES: return "line-list";
        case WebGLRenderingContext.LINE_STRIP: return "line-strip";
        case WebGLRenderingContext.POINTS: return "point-list";
        default: return failure("Unsupported primitive mode!");
    }
}
function computeIfAbsent(map, key, computer) {
    let result = map.get(key);
    if (result === undefined) {
        result = computer(key);
        map.set(key, result);
    }
    return result;
}
//# sourceMappingURL=gltf.gpu.js.map