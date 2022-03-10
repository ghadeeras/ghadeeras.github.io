import { aether } from "/gen/libs.js";
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
        var _a;
        while (this.resources.length > 0) {
            (_a = this.resources.pop()) === null || _a === void 0 ? void 0 : _a.destroy();
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
        var _a;
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
                buffer: ((_a = buffers.get(accessor.bufferView)) !== null && _a !== void 0 ? _a : failure("Missing vertex buffer!")),
            });
        }
        return result;
    }
    asIndex(primitive, buffers) {
        var _a;
        return primitive.indices !== null ? {
            componentType: primitive.indices.componentType,
            offset: primitive.indices.byteOffset,
            buffer: ((_a = buffers.get(primitive.indices.bufferView)) !== null && _a !== void 0 ? _a : failure("Missing index buffer!")),
        } : null;
    }
    gpuBuffers() {
        const buffers = new Map();
        for (const bufferView of this.model.bufferViews) {
            let dataView = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
            const buffer = bufferView.index ?
                this.adapter.indexBuffer(dataView, bufferView.byteStride) :
                this.adapter.vertexBuffer(dataView, bufferView.byteStride);
            this.resources.push(buffer);
            buffers.set(bufferView, buffer);
        }
        return buffers;
    }
    render(renderer) {
        var _a;
        const binder = (_a = this.matrixBinders.get(this.model.scene)) !== null && _a !== void 0 ? _a : failure("There must be at least a scene renderer!");
        binder(renderer);
        for (const node of this.model.scene.nodes) {
            this.renderNode(renderer, node, binder);
        }
    }
    renderNode(renderer, node, parentBinder) {
        var _a;
        const binder = (_a = this.matrixBinders.get(node)) !== null && _a !== void 0 ? _a : parentBinder;
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
        var _a;
        const binder = (_a = this.primitiveBinders.get(primitive)) !== null && _a !== void 0 ? _a : failure(`No renderer for primitive ${primitive.key}`);
        binder(renderer);
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
//# sourceMappingURL=gltf.renderer.js.map