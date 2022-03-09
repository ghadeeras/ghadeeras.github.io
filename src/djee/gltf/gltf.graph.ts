import * as gltf from './gltf.js'
import * as utils from '../utils.js'
import * as aether from '/aether/latest/index.js'
import * as aetherX from '../../utils/aether.js'

export class Model {

    readonly scene: Scene
    readonly scenes: Scene[]
    readonly nodes: Node[]
    readonly meshes: Mesh[]
    readonly accessors: Accessor[]
    readonly bufferViews: BufferView[]

    constructor(model: gltf.Model, readonly buffers: ArrayBuffer[]) {
        gltf.enrichBufferViews(model)
        this.bufferViews = model.bufferViews.map((bufferView, i) => new BufferView(bufferView, i, buffers))
        this.accessors = model.accessors.map((accessor, i) => new Accessor(accessor, i, this.bufferViews))
        this.meshes = model.meshes.map((mesh, i) => new Mesh(mesh, i, this.accessors))
        
        const nodes: utils.Supplier<Node>[] = model.nodes.map((node, i) => utils.lazily(() => new Node(node, i, this.meshes, nodes))) 
        
        this.nodes = nodes.map(node => node())
        this.scenes = model.scenes.map((scene, i) => new Scene(scene, i, this.nodes))
        this.scene = this.scenes[model.scene ?? 0]
    }

    static async create(modelUri: string) {
        const response = await fetch(modelUri, {mode : "cors"})
        const model = await response.json() as gltf.Model
        const buffers: ArrayBufferLike[] = await gltf.fetchBuffers(model.buffers, modelUri)
        return new Model(model, buffers)
    }

}

export interface Identifiable {

    readonly key: string

}

class IdentifiableObject implements Identifiable {

    constructor(readonly key: string) {
    }

} 

export class Scene extends IdentifiableObject {

    readonly nodes: Node[] = []
    readonly range: aetherX.Range3D
    readonly matrix: aether.Mat4

    constructor(scene: gltf.Scene, i: number, nodes: Node[]) {
        super(`scene#${i}`)
        for (const node of scene.nodes) {
            this.nodes.push(nodes[node])
        }
        const ranges = this.nodes.map(node => node.range);
        const range = aetherX.union(ranges);
        this.range = aetherX.isOpen(range) ? [[-1, -1, -1], [1, 1, 1]] : range
        this.matrix = aetherX.centeringMatrix(this.range)
    }

}

export class Node extends IdentifiableObject {

    readonly meshes: Mesh[]
    readonly children: Node[]
    readonly matrix: aether.Mat4
    readonly antiMatrix: aether.Mat4
    readonly isIdentityMatrix: boolean
    readonly range: aetherX.Range3D

    constructor(node: gltf.Node, i: number, meshes: Mesh[], nodes: utils.Supplier<Node>[]) {
        super(`node#${i}`)
        this.matrix = gltf.matrixOf(node)
        this.antiMatrix = aetherX.anti(this.matrix)
        this.isIdentityMatrix = aetherX.isIdentityMatrix(this.matrix)
        this.meshes = node.mesh !== undefined ? [meshes[node.mesh]] : []
        this.children = node.children !== undefined ? node.children.map(child => nodes[child]()) : []
        this.range = aetherX.applyMatrixToRange(this.matrix, aetherX.union([
            aetherX.union(this.meshes.map(mesh => mesh.range)), 
            aetherX.union(this.children.map(child => child.range))
        ]))
    }

}

export class Mesh extends IdentifiableObject {

    readonly primitives: Primitive[]
    readonly range: aetherX.Range3D

    constructor(mesh: gltf.Mesh, i: number, accessors: Accessor[]) {
        super(`mesh#${i}`)
        this.primitives = mesh.primitives.map((primitive, p) => new Primitive(primitive, i, p, accessors))
        this.range = aetherX.union(this.primitives.map(p => p.range))
    }

}

export class Primitive extends IdentifiableObject {

    readonly mode: gltf.PrimitiveMode
    readonly indices: Accessor | null
    readonly count: number;
    readonly attributes: {
        [attributeName: string]: Accessor
    }
    readonly range: aetherX.Range3D

    constructor(primitive: gltf.MeshPrimitive, m: number, i: number, accessors: Accessor[]) {
        super(`primitive#${m}_${i}`)
        this.mode = primitive.mode ?? WebGL2RenderingContext.TRIANGLES
        this.indices = primitive.indices !== undefined ? accessors[primitive.indices] : null
        this.count = this.indices !== null ? this.indices.count : Number.MAX_SAFE_INTEGER
        this.attributes = {}
        for (const key of Object.keys(primitive.attributes)) {
            const accessor = accessors[primitive.attributes[key]]
            this.attributes[key] = accessor
            if (this.indices === null && accessor.count < this.count) {
                this.count = accessor.count
            }
        }
        const position = this.attributes["POSITION"]
        this.range = position.range
    }

}

export class Accessor extends IdentifiableObject {

    readonly bufferView: BufferView
    readonly byteOffset: number
    readonly componentType: gltf.ScalarType
    readonly normalized: boolean
    readonly count: number
    readonly type: gltf.ElementType
    readonly range: aetherX.Range3D

    constructor(accessor: gltf.Accessor, i: number, bufferViews: BufferView[]) {
        super(`accessor#${i}`)
        this.bufferView = bufferViews[accessor.bufferView ?? utils.failure<number>("Using zero buffers not supported yet!")]
        this.byteOffset = accessor.byteOffset ?? 0
        this.componentType = accessor.componentType
        this.normalized = accessor.normalized ?? false
        this.count = accessor.count
        this.type = accessor.type
        this.range = [
            accessor.min !== undefined ? aether.vec3.from(accessor.min) : aetherX.maxVecEver(), 
            accessor.max !== undefined ? aether.vec3.from(accessor.max) : aetherX.minVecEver()
        ] 
    }

}

export class BufferView extends IdentifiableObject {

    readonly buffer: ArrayBuffer
    readonly byteLength: number
    readonly byteOffset: number
    readonly byteStride: number
    readonly index: boolean

    constructor(bufferView: gltf.BufferView, i: number, buffers: ArrayBuffer[]) {
        super(`bufferView#${i}`)
        this.buffer = buffers[bufferView.buffer]
        this.byteLength = bufferView.byteLength
        this.byteOffset = bufferView.byteOffset ?? 0
        this.byteStride = bufferView.byteStride ?? 0
        this.index = bufferView.target == WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER
    }

}
