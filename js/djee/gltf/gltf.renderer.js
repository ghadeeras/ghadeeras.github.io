import * as aether from "aether";
import { failure } from "../utils.js";
import * as graph from "../gltf/gltf.graph.js";
export class GLTFRenderer {
    constructor(model, adapter) {
        this.model = model;
        this.adapter = adapter;
        this.resources = [];
        this.nodeLevelRenderingRoutines = this.createNodeLevelRenderingRoutines();
        this.primitiveLevelRenderingRoutines = this.createPrimitiveLevelRenderingRoutines();
    }
    destroy() {
        while (this.resources.length > 0) {
            this.resources.pop()?.destroy();
        }
    }
    createNodeLevelRenderingRoutines() {
        const data = collectNodeLevelData(this.model.scene);
        const resources = this.adapter.nodeLevelResources(data.matrices);
        this.resources.push(resources);
        const mapping = data.mappings[0];
        const binder = mapping.matrixIndex !== null
            ? this.adapter.nodeLevelBinder(resources, mapping.matrixIndex)
            : () => { };
        const routines = [this.createNodeLevelRenderingRoutine(mapping.node, binder)];
        for (let i = 1; i < data.mappings.length; i++) {
            const mapping = data.mappings[i];
            const binder = mapping.matrixIndex !== null && mapping.matrixIndex !== data.mappings[i - 1].matrixIndex
                ? this.adapter.nodeLevelBinder(resources, mapping.matrixIndex)
                : () => { };
            routines.push(this.createNodeLevelRenderingRoutine(mapping.node, binder));
        }
        return routines;
    }
    createNodeLevelRenderingRoutine(node, binder) {
        return node instanceof graph.Scene ? binder : renderer => this.renderNode(renderer, node, binder);
    }
    createPrimitiveLevelRenderingRoutines() {
        const resources = this.adapter.primitiveLevelResources(this.model.materials);
        this.resources.push(resources);
        const buffers = this.gpuBuffers();
        const meshRoutines = [];
        for (const mesh of this.model.meshes) {
            const primitiveRoutines = [];
            meshRoutines.push(primitiveRoutines);
            for (const primitive of mesh.primitives) {
                const renderer = this.createPrimitiveLevelRenderingRoutine(primitive, buffers, resources);
                primitiveRoutines.push(renderer);
            }
        }
        return meshRoutines;
    }
    createPrimitiveLevelRenderingRoutine(primitive, buffers, resources) {
        const index = this.asIndex(primitive, buffers);
        const attributes = this.asVertexAttributes(primitive, buffers);
        return this.adapter.primitiveLevelRenderingRoutine(primitive.count, primitive.mode, resources, primitive.material.index, attributes, index);
    }
    asVertexAttributes(primitive, buffers) {
        const result = [];
        for (const attribute of Object.keys(primitive.attributes)) {
            const accessor = primitive.attributes[attribute];
            result.push({
                name: attribute,
                type: accessor.type,
                componentType: accessor.componentType,
                offset: accessor.byteOffset,
                stride: accessor.bufferView.byteStride,
                normalized: accessor.normalized,
                buffer: (buffers.get(accessor.bufferView) ?? failure("Missing vertex buffer!")),
            });
        }
        return result;
    }
    asIndex(primitive, buffers) {
        return primitive.indices !== null ? {
            componentType: primitive.indices.componentType,
            offset: primitive.indices.byteOffset,
            buffer: (buffers.get(primitive.indices.bufferView) ?? failure("Missing index buffer!")),
        } : null;
    }
    gpuBuffers() {
        const buffers = new Map();
        for (const bufferView of this.model.bufferViews) {
            const dataView = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
            const buffer = bufferView.index ?
                this.adapter.indexBuffer(dataView, bufferView.byteStride) :
                this.adapter.vertexBuffer(dataView, bufferView.byteStride);
            this.resources.push(buffer);
            buffers.set(bufferView, buffer);
        }
        return buffers;
    }
    render(renderer) {
        for (const routine of this.nodeLevelRenderingRoutines) {
            routine(renderer);
        }
    }
    renderNode(renderer, node, binder) {
        binder(renderer);
        for (const mesh of node.meshes) {
            this.renderMesh(renderer, mesh);
        }
    }
    renderMesh(renderer, mesh) {
        for (const primitive of mesh.primitives) {
            this.renderPrimitive(renderer, primitive);
        }
    }
    renderPrimitive(renderer, primitive) {
        const routine = this.primitiveLevelRenderingRoutines[primitive.meshIndex][primitive.index];
        routine(renderer);
    }
}
function collectNodeLevelData(scene) {
    const matrix = {
        matrix: aether.mat4.identity(),
        antiMatrix: aether.mat4.identity()
    };
    const resources = {
        matrices: [],
        mappings: [{
                node: scene,
                matrixIndex: null
            }]
    };
    let index = null;
    for (const node of scene.nodes) {
        index = doCollectNodeLevelData(node, matrix, index, resources);
    }
    return resources;
}
function doCollectNodeLevelData(node, parentMatrix, parentIndex, resources) {
    const matrix = node.isIdentityMatrix ? parentMatrix : {
        matrix: aether.mat4.mul(parentMatrix.matrix, node.matrix),
        antiMatrix: aether.mat4.mul(parentMatrix.antiMatrix, node.antiMatrix)
    };
    let index = node.isIdentityMatrix ? parentIndex : null;
    if (index === null && node.meshes.length > 0) {
        index = resources.matrices.length;
        resources.matrices.push(matrix);
    }
    resources.mappings.push({ node, matrixIndex: index });
    for (const child of node.children) {
        index = doCollectNodeLevelData(child, matrix, index, resources);
    }
    return parentIndex === null && node.isIdentityMatrix && index !== null ? index : parentIndex;
}
//# sourceMappingURL=gltf.renderer.js.map