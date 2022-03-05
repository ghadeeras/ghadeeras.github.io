import * as gltf from './gltf.js'
import * as utils from '../utils.js'
import * as aether from '/aether/latest/index.js'

export class Model {

    readonly scene: Scene
    readonly scenes: Scene[]
    readonly nodes: Node[]
    readonly meshes: Mesh[]
    readonly accessors: Accessor[]
    readonly bufferViews: BufferView[]

    constructor(model: gltf.Model, readonly buffers: ArrayBuffer[]) {
        markIndexBufferView(model)
        this.bufferViews = model.bufferViews.map((bufferView, i) => new BufferView(bufferView, i, buffers))
        this.accessors = model.accessors.map((accessor, i) => new Accessor(accessor, i, this.bufferViews))
        this.meshes = model.meshes.map((mesh, i) => new Mesh(mesh, i, this.accessors))
        this.nodes = model.nodes.map((node, i) => new Node(node, i, this.meshes))
        this.nodes.forEach(node => node.wire(this.nodes))
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

    constructor(scene: gltf.Scene, i: number, nodes: Node[]) {
        super(`scene#${i}`)
        for (const node of scene.nodes) {
            this.nodes.push(nodes[node])
        }
    }

}

export class Node extends IdentifiableObject {

    readonly meshes: Mesh[] = []
    readonly children: Node[] = []
    readonly matrix: aether.Mat4
    readonly antiMatrix: aether.Mat4
    readonly isIdentityMatrix: boolean

    private gltfNode: gltf.Node

    constructor(node: gltf.Node, i: number, meshes: Mesh[]) {
        super(`node#${i}`)
        if (node.mesh !== undefined) {
            this.meshes.push(meshes[node.mesh])
        }
        this.matrix = node.matrix !== undefined ? 
            aether.mat4.from(node.matrix) : 
            aether.mat4.identity()
        this.matrix = node.translation !== undefined ? 
            aether.mat4.mul(this.matrix, aether.mat4.translation(node.translation)) :
            this.matrix 
        this.matrix = node.rotation !== undefined ? 
            aether.mat4.mul(this.matrix, aether.mat4.cast(aether.quat.toMatrix(node.rotation))) :
            this.matrix 
        this.matrix = node.scale !== undefined ? 
            aether.mat4.mul(this.matrix, aether.mat4.scaling(...node.scale)) :
            this.matrix
        this.antiMatrix = aether.mat4.transpose(aether.mat4.inverse(this.matrix)) 
        this.isIdentityMatrix = isIdentityMatrix(this.matrix)
        this.gltfNode = node
    }

    wire(nodes: Node[]) {
        if (this.children.length > 0) {
            return
        }
        if (this.gltfNode.children != undefined) {
            for (const child of this.gltfNode.children) {
                this.children.push(nodes[child])
            }
        }
    }

}

export class Mesh extends IdentifiableObject {

    readonly primitives: Primitive[]

    constructor(mesh: gltf.Mesh, i: number, accessors: Accessor[]) {
        super(`mesh#${i}`)
        this.primitives = mesh.primitives.map((primitive, p) => new Primitive(primitive, i, p, accessors))
    }

}

export class Primitive extends IdentifiableObject {

    readonly mode: gltf.PrimitiveMode
    readonly indices: Accessor | null
    readonly count: number;
    readonly attributes: {
        [attributeName: string]: Accessor
    }

    constructor(primitive: gltf.MeshPrimitive, m: number, i: number, accessors: Accessor[]) {
        super(`primitive#${m}_${i}`)
        this.mode = primitive.mode ?? WebGLRenderingContext.TRIANGLES
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
    }

}

export class Accessor extends IdentifiableObject {

    readonly bufferView: BufferView
    readonly byteOffset: number
    readonly componentType: gltf.ScalarType
    readonly normalized: boolean
    readonly count: number
    readonly type: gltf.ElementType
    readonly min: number[]
    readonly max: number[]

    constructor(accessor: gltf.Accessor, i: number, bufferViews: BufferView[]) {
        super(`accessor#${i}`)
        this.bufferView = bufferViews[accessor.bufferView ?? utils.failure<number>("Using zero buffers not supported yet!")]
        this.byteOffset = accessor.byteOffset ?? 0
        this.componentType = accessor.componentType
        this.normalized = accessor.normalized ?? false
        this.count = accessor.count
        this.type = accessor.type
        this.min = accessor.min ?? [-1, -1, -1]
        this.max = accessor.max ?? [+1, +1, +1]
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
        this.index = bufferView.target == WebGLRenderingContext.ELEMENT_ARRAY_BUFFER
    }

}

function markIndexBufferView(model: gltf.Model) {
    for (const mesh of model.meshes) {
        for (const primitive of mesh.primitives) {
            if (primitive.indices !== undefined) {
                model.bufferViews[model.accessors[primitive.indices].bufferView ?? utils.failure<number>("Using zero buffers not supported yet!")].target = WebGLRenderingContext.ELEMENT_ARRAY_BUFFER
            }
        }
    }
}
function isIdentityMatrix(matrix: aether.Mat4): boolean {
    for (let i = 0; i < 4; i++) {
        for (let j = i; j < 4; j++) {
            if (i === j) {
                if (matrix[i][j] !== 1) {
                    return false
                }
            } else {
                if (matrix[i][j] !== 0 || matrix[j][i] !== 0) {
                    return false
                }
            }
        }
    }
    return true
}

