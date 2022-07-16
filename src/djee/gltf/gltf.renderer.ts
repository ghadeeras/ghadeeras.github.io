import { aether } from "/gen/libs.js";
import { Resource } from "../index.js";
import { failure } from "../utils.js";
import * as gltf from "../gltf/gltf.js";
import * as graph from "../gltf/gltf.graph.js";

export interface APIAdapter<U extends Resource, V extends Resource, I extends Resource, R> {

    matricesBuffer(matrices: Matrix[]): U

    vertexBuffer(view: DataView, stride: number): V

    indexBuffer(view: DataView, stride: number): I

    matrixBinder(matrixBuffer: U, index: number): Binder<R>

    primitiveBinder(count: number, mode: gltf.PrimitiveMode, attributes: VertexAttribute<V>[], index?: Index<I> | null): Binder<R>

}

export type Index<I> = {
    componentType: gltf.ScalarType,
    offset: number,
    buffer: I,
}

export type VertexAttribute<V> = {
    name: string,
    type: gltf.ElementType,
    componentType: gltf.ScalarType,
    offset: number,
    stride: number,
    normalized: boolean,
    buffer: V,
}

export type Binder<R> = (renderer: R) => void

export type Matrix = {
    matrix: aether.Mat4,
    antiMatrix: aether.Mat4,
}

export class GLTFRenderer<U extends Resource, V extends Resource, I extends Resource, R> {

    private matrixBinders: Map<graph.Node | graph.Scene, Binder<R>>
    private primitiveBinders: Map<graph.Primitive, Binder<R>>
    
    private resources: Resource[] = []

    constructor(
        private model: graph.Model, 
        private adapter: APIAdapter<U, V, I, R> 
    ) {
        this.matrixBinders = this.createNodeBinders()
        this.primitiveBinders = this.createPrimitiveBinders();
    }

    destroy() {
        while (this.resources.length > 0) {
            this.resources.pop()?.destroy()
        }
    }

    private createNodeBinders(): typeof this.matrixBinders {
        const matrices = collectSceneMatrices(this.model.scene)
        const buffer = this.adapter.matricesBuffer(matrices)
        this.resources.push(buffer)
        return this.createSceneNodeBinders(this.model.scene, buffer);
    }

    private createSceneNodeBinders(scene: graph.Scene, matricesBuffer: U): typeof this.matrixBinders {
        const map: typeof this.matrixBinders = new Map()
        map.set(scene, this.adapter.matrixBinder(matricesBuffer, 0))
        for (const node of scene.nodes) {
            this.createNodeChildBinders(node, false, matricesBuffer, map)
        }
        return map
    }
    
    private createNodeChildBinders(node: graph.Node, parentDirty: boolean, matricesBuffer: U, map: typeof this.matrixBinders): typeof this.matrixBinders {
        let dirty = parentDirty || !node.isIdentityMatrix
        if (dirty && node.meshes.length > 0) {
            map.set(node, this.adapter.matrixBinder(matricesBuffer, map.size))
            dirty = false
        }
        for (const child of node.children) {
            this.createNodeChildBinders(child, dirty, matricesBuffer, map)
        }
        return map
    }
    
    private createPrimitiveBinders(): typeof this.primitiveBinders {
        const buffers = this.gpuBuffers();
        const primitiveRenderers: typeof this.primitiveBinders = new Map()
        for (const mesh of this.model.meshes) {
            for (const primitive of mesh.primitives) {
                const renderer = this.primitiveBinder(primitive, buffers);
                primitiveRenderers.set(primitive, renderer);
            }
        }
        return primitiveRenderers
    }

    private primitiveBinder(primitive: graph.Primitive, buffers: Map<graph.BufferView, V | I>): Binder<R> {
        const index = this.asIndex(primitive, buffers);
        const attributes = this.asVertexAttributes(primitive, buffers);
        return this.adapter.primitiveBinder(primitive.count, primitive.mode, attributes, index)        
    }
    
    private asVertexAttributes(primitive: graph.Primitive, buffers: Map<graph.BufferView, V | I>): VertexAttribute<V>[] {
        const result: VertexAttribute<V>[] = [];
        for (const attribute of Object.keys(primitive.attributes)) {
            const accessor = primitive.attributes[attribute];
            result.push({
                name: attribute,
                type: accessor.type,
                componentType: accessor.componentType,
                offset: accessor.byteOffset,
                stride: accessor.bufferView.byteStride,
                normalized: accessor.normalized,
                buffer: (buffers.get(accessor.bufferView) ?? failure("Missing vertex buffer!")) as V,
            })
        }
        return result;
    }
    
    private asIndex(primitive: graph.Primitive, buffers: Map<graph.BufferView, V | I>): Index<I> | null {
        return primitive.indices !== null ? {
            componentType: primitive.indices.componentType,
            offset: primitive.indices.byteOffset,
            buffer: (buffers.get(primitive.indices.bufferView) ?? failure<I>("Missing index buffer!")) as I,
        } : null;
    }
    
    private gpuBuffers() {
        const buffers: Map<graph.BufferView, V | I> = new Map();
        for (const bufferView of this.model.bufferViews) {
            const dataView = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
            const buffer = bufferView.index ? 
                this.adapter.indexBuffer(dataView, bufferView.byteStride) :
                this.adapter.vertexBuffer(dataView, bufferView.byteStride)
            this.resources.push(buffer)
            buffers.set(bufferView, buffer);
        }
        return buffers;
    }
    
    render(renderer: R) {
        const binder: Binder<R> = this.matrixBinders.get(this.model.scene) ?? failure("There must be at least a scene renderer!");
        binder(renderer)
        for (const node of this.model.scene.nodes) {
            this.renderNode(renderer, node, binder)
        }
    }

    private renderNode(renderer: R, node: graph.Node, parentBinder: Binder<R>) {
        const binder = this.matrixBinders.get(node) ?? parentBinder
        if (node.meshes.length > 0) {
            binder(renderer)
        }
        for (const mesh of node.meshes) {
            this.renderMesh(renderer, mesh)
        }
        for (const child of node.children) {
            this.renderNode(renderer, child, binder)
        }
    }

    private renderMesh(renderer: R, mesh: graph.Mesh) {
        for (const primitive of mesh.primitives) {
            this.renderPrimitive(renderer, primitive)
        }
    }

    private renderPrimitive(renderer: R, primitive: graph.Primitive) {
        const binder: Binder<R> = this.primitiveBinders.get(primitive) ?? failure(`No renderer for primitive ${primitive.key}`)
        binder(renderer)
    }

}

function collectSceneMatrices(scene: graph.Scene): Matrix[] {
    const matrix: Matrix = {
        matrix: scene.matrix,
        antiMatrix: aether.mat4.identity()
    }
    const matrices = [matrix]
    for (const node of scene.nodes) {
        collectNodeMatrices(node, false, matrix, matrices)
    }
    return matrices
}

function collectNodeMatrices(node: graph.Node, parentDirty: boolean, parentMatrix: Matrix, matrices: Matrix[]): Matrix[] {
    const matrix: Matrix = {
        matrix: aether.mat4.mul(parentMatrix.matrix, node.matrix),
        antiMatrix: aether.mat4.mul(parentMatrix.antiMatrix, node.antiMatrix)
    }
    let dirty = parentDirty || !node.isIdentityMatrix
    if (dirty && node.meshes.length > 0) {
        matrices.push(matrix)
        dirty = false
    }
    for (const child of node.children) {
        collectNodeMatrices(child, dirty, matrix, matrices)
    }
    return matrices
}
