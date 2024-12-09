import * as aether from "aether";
import { failure } from "../utils.js";
export class GLTFRenderer {
    constructor(model, adapter) {
        this.model = model;
        this.adapter = adapter;
        this.resources = [];
        this.matrixBinders = this.createNodeBinders();
        this.primitiveBinders = this.createPrimitiveBinders();
    }
    destroy() {
        while (this.resources.length > 0) {
            this.resources.pop()?.destroy();
        }
    }
    createNodeBinders() {
        const matrices = collectSceneMatrices(this.model.scene);
        const buffer = this.adapter.matricesBuffer(matrices);
        this.resources.push(buffer);
        return this.createSceneNodeBinders(this.model.scene, buffer);
    }
    createSceneNodeBinders(scene, matricesBuffer) {
        const map = new Map();
        map.set(scene, this.adapter.matrixBinder(matricesBuffer, 0));
        for (const node of scene.nodes) {
            this.createNodeChildBinders(node, false, matricesBuffer, map);
        }
        return map;
    }
    createNodeChildBinders(node, parentDirty, matricesBuffer, map) {
        let dirty = parentDirty || !node.isIdentityMatrix;
        if (dirty && node.meshes.length > 0) {
            map.set(node, this.adapter.matrixBinder(matricesBuffer, map.size));
            dirty = false;
        }
        for (const child of node.children) {
            this.createNodeChildBinders(child, dirty, matricesBuffer, map);
        }
        return map;
    }
    createPrimitiveBinders() {
        const buffers = this.gpuBuffers();
        const primitiveRenderers = new Map();
        for (const mesh of this.model.meshes) {
            for (const primitive of mesh.primitives) {
                const renderer = this.primitiveBinder(primitive, buffers);
                primitiveRenderers.set(primitive, renderer);
            }
        }
        return primitiveRenderers;
    }
    primitiveBinder(primitive, buffers) {
        const index = this.asIndex(primitive, buffers);
        const attributes = this.asVertexAttributes(primitive, buffers);
        return this.adapter.primitiveBinder(primitive.count, primitive.mode, attributes, index);
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
        const binder = this.matrixBinders.get(this.model.scene) ?? failure("There must be at least a scene renderer!");
        binder(renderer);
        for (const node of this.model.scene.nodes) {
            this.renderNode(renderer, node, binder);
        }
    }
    renderNode(renderer, node, parentBinder) {
        const binder = this.matrixBinders.get(node) ?? parentBinder;
        if (node.meshes.length > 0) {
            binder(renderer);
        }
        for (const mesh of node.meshes) {
            this.renderMesh(renderer, mesh);
        }
        for (const child of node.children) {
            this.renderNode(renderer, child, binder);
        }
    }
    renderMesh(renderer, mesh) {
        for (const primitive of mesh.primitives) {
            this.renderPrimitive(renderer, primitive);
        }
    }
    renderPrimitive(renderer, primitive) {
        const binder = this.primitiveBinders.get(primitive) ?? failure(`No renderer for primitive ${primitive.key}`);
        binder(renderer);
    }
}
function collectSceneMatrices(scene) {
    const matrix = {
        matrix: aether.mat4.identity(),
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
//# sourceMappingURL=gltf.renderer.js.map