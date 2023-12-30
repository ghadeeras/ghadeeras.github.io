import * as gltf from './gltf.js'
import * as utils from '../utils.js'
import * as aether from '/aether/latest/index.js'
import * as aetherX from '../../utils/aether.js'

export class Model {

    readonly scene: Scene
    readonly scenes: Scene[]
    readonly nodes: Node[]
    readonly cameras: Camera[]
    readonly meshes: Mesh[]
    readonly accessors: Accessor[]
    readonly bufferViews: BufferView[]

    constructor(model: gltf.Model, readonly buffers: ArrayBuffer[], legacyPerspective: boolean) {
        gltf.enrichBufferViews(model)
        this.bufferViews = model.bufferViews.map((bufferView, i) => new BufferView(bufferView, i, buffers, model.accessors))
        this.accessors = model.accessors.map((accessor, i) => new Accessor(accessor, i, this.bufferViews))
        this.cameras = (model.cameras ?? []).map(camera => Camera.create(camera, legacyPerspective))
        this.meshes = model.meshes.map((mesh, i) => new Mesh(mesh, i, this.accessors))
        
        const nodes: utils.Supplier<Node>[] = model.nodes.map((node, i) => 
            utils.lazily(() => new Node(node, i, this.meshes, this.cameras, nodes))
        )
        
        this.nodes = nodes.map(node => node())
        this.scenes = model.scenes.map((scene, i) => new Scene(scene, i, this.nodes, legacyPerspective))
        this.scene = this.scenes[model.scene ?? 0]
    }

    static async create(modelUri: string, legacyPerspective = false) {
        const response = await fetch(modelUri, {mode : "cors"})
        const model = await response.json() as gltf.Model
        const buffers: ArrayBufferLike[] = await gltf.fetchBuffers(model.buffers, modelUri)
        return new Model(model, buffers, legacyPerspective)
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
    readonly perspectives: Perspective[]

    constructor(scene: gltf.Scene, i: number, nodes: Node[], legacyPerspective: boolean) {
        super(`scene#${i}`)
        for (const node of scene.nodes) {
            this.nodes.push(nodes[node])
        }
        const ranges = this.nodes.map(node => node.range);
        const range = aetherX.union(ranges);
        this.range = aetherX.isOpen(range) ? [[-1, -1, -1], [1, 1, 1]] : range
        this.matrix = aether.mat4.identity()
        this.perspectives = collectScenePerspectives(this)
        if (this.perspectives.length === 0) {
            this.matrix = aetherX.centeringMatrix(this.range)
            this.perspectives.push(defaultPerspective(legacyPerspective))
        }
    }

}

export class Node extends IdentifiableObject {

    readonly cameras: [Camera] | []
    readonly meshes: [Mesh] | []
    readonly children: Node[]
    readonly matrix: aether.Mat4
    readonly antiMatrix: aether.Mat4
    readonly isIdentityMatrix: boolean
    readonly range: aetherX.Range3D

    constructor(node: gltf.Node, i: number, meshes: Mesh[], cameras: Camera[], nodes: utils.Supplier<Node>[]) {
        super(`node#${i}`)
        this.matrix = gltf.matrixOf(node)
        this.antiMatrix = aetherX.anti(this.matrix)
        this.isIdentityMatrix = aetherX.isIdentityMatrix(this.matrix)
        this.cameras = node.camera !== undefined ? [cameras[node.camera]] : []
        this.meshes = node.mesh !== undefined ? [meshes[node.mesh]] : []
        this.children = node.children !== undefined ? node.children.map(child => nodes[child]()) : []
        this.range = aetherX.applyMatrixToRange(this.matrix, aetherX.union([
            aetherX.union(this.meshes.map(mesh => mesh.range)), 
            aetherX.union(this.children.map(child => child.range))
        ]))
    }

}

export class Perspective {

    readonly antiMatrix: aether.Mat4
    
    constructor(readonly camera: Camera, readonly matrix: aether.Mat4) {
        this.antiMatrix = aetherX.anti(matrix)
    }

}

export abstract class Camera {

    constructor(readonly zNear: number, readonly zFar: number | null) {
    }

    abstract matrix(aspectRatio?: number, mag?: number): aether.Mat4

    abstract inverseMatrix(aspectRatio?: number, mag?: number): aether.Mat4

    static create(camera: gltf.Camera, legacy: boolean): Camera {
        return camera.type == "perspective"
            ? new PerspectiveCamera(camera.perspective, legacy)
            : new OrthographicCamera(camera.orthographic, legacy)
    }

}

export class PerspectiveCamera extends Camera {

    readonly projection: aether.PerspectiveProjection
    readonly focalLength: number
    readonly aspectRatio: number

    constructor(camera: gltf.PerspectiveCamera["perspective"], legacy = false) {
        super(camera.znear, camera.zfar ?? null)
        this.projection = new aether.PerspectiveProjection(this.zNear, this.zFar, true, legacy)
        this.focalLength = 1.0 / Math.tan(0.5 * camera.yfov)
        this.aspectRatio = camera.aspectRatio ?? 1.0
    }

    matrix(aspectRatio: number = this.aspectRatio, mag: number = this.focalLength): aether.Mat4 {
        return this.projection.matrix(mag, aspectRatio)
    }

    inverseMatrix(aspectRatio: number = this.aspectRatio, mag: number = this.focalLength): aether.Mat4 {
        return this.projection.inverseMatrix(mag, aspectRatio)
    }

}

/* TODO: Fix this! */
export class OrthographicCamera extends Camera {

    readonly camera: PerspectiveCamera

    constructor(camera: gltf.OrthographicCamera["orthographic"], legacy = false) {
        super(camera.znear, camera.zfar)
        this.camera = new PerspectiveCamera({
            yfov: Math.atan2(1, Math.sqrt(camera.xmag * camera.ymag)),
            znear: camera.znear,
            zfar: camera.zfar,
            aspectRatio: camera.ymag / camera.xmag
        }, legacy)
    }

    matrix(aspectRatio: number = this.camera.aspectRatio, mag: number = this.camera.focalLength): aether.Mat4 {
        return this.camera.matrix(aspectRatio, mag)
    }

    inverseMatrix(aspectRatio: number = this.camera.aspectRatio, mag: number = this.camera.focalLength): aether.Mat4 {
        return this.camera.inverseMatrix(aspectRatio, mag)
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
    readonly interleaved: boolean

    constructor(bufferView: gltf.BufferView, i: number, buffers: ArrayBuffer[], accessors: gltf.Accessor[]) {
        super(`bufferView#${i}`)
        const references = accessors.filter(accessor => accessor.bufferView === i)
        const offsets = references.map(r => r.byteOffset ?? 0)
        this.index = bufferView.target == WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER
        this.interleaved = offsets.length === 0 || !this.index && offsets.every(o => o === offsets[0])
        this.buffer = buffers[bufferView.buffer]
        this.byteLength = bufferView.byteLength
        this.byteOffset = bufferView.byteOffset ?? 0
        this.byteStride = bufferView.byteStride ?? (this.interleaved ?
            references
                .map(accessor => sizeOf(accessor))
                .reduce((s1, s2) => s1 + s2, 0) :
            sizeOf(references[0])
        )
    }

}

export function defaultPerspective(legacyPerspective: boolean = false): Perspective {
    return new Perspective(
        defaultCamera(legacyPerspective),
        defaultViewMatrix()
    )
}

export function defaultCamera(legacyPerspective = false): Camera {
    return new PerspectiveCamera({
        yfov: 2 * Math.atan(0.5),
        znear: 1
    }, legacyPerspective)
}

export function defaultViewMatrix(): [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] {
    return aether.mat4.lookAt([2, 2, 2])
}

function sizeOf(accessor: gltf.Accessor): number {
    return elementSize(accessor.type) * componentSize(accessor.componentType)
}

function elementSize(type: gltf.ElementType): number {
    switch (type) {
        case "SCALAR": return 1
        case "VEC2": return 2
        case "VEC3": return 3
        case "VEC4": return 4
        case "MAT2": return 4
        case "MAT3": return 9
        case "MAT4": return 16
        default: return utils.failure(`Unrecognized element type: ${type}`)
    }
}

function componentSize(componentType: gltf.ScalarType): number {
    switch (componentType) {
        case WebGL2RenderingContext.BYTE: 
        case WebGL2RenderingContext.UNSIGNED_BYTE: return 1 
        case WebGL2RenderingContext.SHORT:  
        case WebGL2RenderingContext.UNSIGNED_SHORT: return 2 
        case WebGL2RenderingContext.INT:
        case WebGL2RenderingContext.UNSIGNED_INT: 
        case WebGL2RenderingContext.FLOAT: return 4
        default: return utils.failure(`Unrecognized scalar type: ${componentType}`)
    }
}

function collectScenePerspectives(scene: Scene): Perspective[] {
    const perspectives: Perspective[] = []
    for (const node of scene.nodes) {
        collectNodePerspectives(node, scene.matrix, perspectives)
    }
    return perspectives
}

function collectNodePerspectives(node: Node, parentMatrix: aether.Mat4, perspectives: Perspective[]) {
    const matrix = node.isIdentityMatrix ? parentMatrix : aether.mat4.mul(parentMatrix, node.matrix)
    if (node.cameras[0]) {
        const m = aetherX.orthogonal(aether.mat4.inverse(matrix))
        perspectives.push(new Perspective(node.cameras[0], m))
    }
    for (const child of node.children) {
        collectNodePerspectives(child, matrix, perspectives)
    }
}
