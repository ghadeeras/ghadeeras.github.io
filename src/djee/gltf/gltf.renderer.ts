import * as aether from "aether"
import { Resource } from "lumen";
import { failure } from "../utils.js";
import * as gltf from "../gltf/gltf.js";
import * as graph from "../gltf/gltf.graph.js";

export interface APIAdapter<N extends Resource, P extends Resource, V extends Resource, I extends Resource, R> {

    nodeLevelResources(matrices: Matrix[]): N

    primitiveLevelResources(materials: graph.Material[]): P

    vertexBuffer(view: DataView, stride: number): V

    indexBuffer(view: DataView, stride: number): I

    nodeLevelBinder(resources: N, matrixIndex: number): RenderingRoutine<R>

    primitiveLevelRenderingRoutine(count: number, mode: gltf.PrimitiveMode, resources: P, materialIndex: number, attributes: VertexAttribute<V>[], index?: Index<I> | null): RenderingRoutine<R>

}

export type Index<I extends Resource> = {
    componentType: gltf.ScalarType,
    offset: number,
    buffer: I,
}

export type VertexAttribute<V extends Resource> = {
    name: string,
    type: gltf.ElementType,
    componentType: gltf.ScalarType,
    offset: number,
    stride: number,
    normalized: boolean,
    buffer: V,
}

export type RenderingRoutine<R> = (renderer: R) => void

export type Matrix = {
    matrix: aether.Mat4,
    antiMatrix: aether.Mat4,
}

export class GLTFRenderer<N extends Resource, P extends Resource, V extends Resource, I extends Resource, R> {

    private nodeLevelRenderingRoutines: RenderingRoutine<R>[]
    private primitiveLevelRenderingRoutines: RenderingRoutine<R>[][]
    
    private resources: Resource[] = []

    constructor(
        private model: graph.Model, 
        private adapter: APIAdapter<N, P, V, I, R> 
    ) {
        this.nodeLevelRenderingRoutines = this.createNodeLevelRenderingRoutines()
        this.primitiveLevelRenderingRoutines = this.createPrimitiveLevelRenderingRoutines();
    }

    destroy() {
        while (this.resources.length > 0) {
            this.resources.pop()?.destroy()
        }
    }

    private createNodeLevelRenderingRoutines(): RenderingRoutine<R>[] {
        const data = collectNodeLevelData(this.model.scene)
        const resources = this.adapter.nodeLevelResources(data.matrices)
        this.resources.push(resources)

        const mapping  = data.mappings[0]
        const binder   = mapping.matrixIndex !== null 
            ? this.adapter.nodeLevelBinder(resources, mapping.matrixIndex) 
            : () => {}
        const routines = [this.createNodeLevelRenderingRoutine(mapping.node, binder)]
        for (let i = 1; i < data.mappings.length; i++) {
            const mapping = data.mappings[i]
            const binder  = mapping.matrixIndex !== null && mapping.matrixIndex !== data.mappings[i - 1].matrixIndex 
                ? this.adapter.nodeLevelBinder(resources, mapping.matrixIndex) 
                : () => {}
            routines.push(this.createNodeLevelRenderingRoutine(mapping.node, binder))
        }
        return routines
    }

    private createNodeLevelRenderingRoutine(node: graph.Node | graph.Scene, binder: RenderingRoutine<R>): RenderingRoutine<R> {
        return node instanceof graph.Scene ? binder : renderer => this.renderNode(renderer, node, binder)
    }

    private createPrimitiveLevelRenderingRoutines(): typeof this.primitiveLevelRenderingRoutines {
        const resources = this.adapter.primitiveLevelResources(this.model.materials)
        this.resources.push(resources)
        const buffers = this.gpuBuffers();
        const meshRoutines: RenderingRoutine<R>[][] = []
        for (const mesh of this.model.meshes) {
            const primitiveRoutines: RenderingRoutine<R>[] = []
            meshRoutines.push(primitiveRoutines)
            for (const primitive of mesh.primitives) {
                const renderer = this.createPrimitiveLevelRenderingRoutine(primitive, buffers, resources);
                primitiveRoutines.push(renderer);
            }
        }
        return meshRoutines
    }

    private createPrimitiveLevelRenderingRoutine(primitive: graph.Primitive, buffers: Map<graph.BufferView, V | I>, resources: P): RenderingRoutine<R> {
        const index = this.asIndex(primitive, buffers);
        const attributes = this.asVertexAttributes(primitive, buffers);
        return this.adapter.primitiveLevelRenderingRoutine(primitive.count, primitive.mode, resources, primitive.material.index, attributes, index)        
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
        for (const routine of this.nodeLevelRenderingRoutines) {
            routine(renderer)
        }
    }

    private renderNode(renderer: R, node: graph.Node, binder: RenderingRoutine<R>) {
        binder(renderer);
        for (const mesh of node.meshes) {
            this.renderMesh(renderer, mesh);
        }
    }

    private renderMesh(renderer: R, mesh: graph.Mesh) {
        for (const primitive of mesh.primitives) {
            this.renderPrimitive(renderer, primitive)
        }
    }

    private renderPrimitive(renderer: R, primitive: graph.Primitive) {
        const routine = this.primitiveLevelRenderingRoutines[primitive.meshIndex][primitive.index]
        routine(renderer)
    }

}

function collectNodeLevelData(scene: graph.Scene): NodeLevelResources {
    const matrix: Matrix = {
        matrix: aether.mat4.identity(),
        antiMatrix: aether.mat4.identity()
    }
    const resources: NodeLevelResources = {
        matrices: [],
        mappings: [{
            node: scene,
            matrixIndex: null
        }]
    }
    let index: number | null = null
    for (const node of scene.nodes) {
        index = doCollectNodeLevelData(node, matrix, index, resources)
    }
    return resources
}

function doCollectNodeLevelData(node: graph.Node, parentMatrix: Matrix, parentIndex: number | null, resources: NodeLevelResources): number | null {
    const matrix = node.isIdentityMatrix ? parentMatrix : {
        matrix: aether.mat4.mul(parentMatrix.matrix, node.matrix),
        antiMatrix: aether.mat4.mul(parentMatrix.antiMatrix, node.antiMatrix)
    }
    let index = node.isIdentityMatrix ? parentIndex : null
    if (index === null && node.meshes.length > 0) {
        index = resources.matrices.length
        resources.matrices.push(matrix)
    }
    resources.mappings.push({ node, matrixIndex: index })
    for (const child of node.children) {
        index = doCollectNodeLevelData(child, matrix, index, resources)
    }
    return parentIndex === null && node.isIdentityMatrix && index !== null ? index : parentIndex
}

type NodeLevelMapping = {
    node: graph.Node | graph.Scene;
    matrixIndex: number | null;
};

type NodeLevelResources = {
    matrices: Matrix[],
    mappings: NodeLevelMapping[]
}
