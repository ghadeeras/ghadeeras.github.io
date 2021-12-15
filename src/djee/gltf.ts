import { Mat, mat4, quat, Vec, vec3, vec4 } from "ether"
import { Attribute } from "./attribute.js"
import { AttributesBuffer, Buffer, IndicesBuffer } from "./buffer.js"
import { Context } from "./context.js"
import { asVariableInfo, VariableInfo } from "./reflection.js"
import { Uniform } from "./uniform.js"
import { failure, lazily, Supplier } from "./utils.js"

export type Model = {

    asset: {
        version: "2.0"
    }

    scene?: number

    scenes: Scene[]

    nodes: Node[]

    meshes: Mesh[]

    buffers: BufferRef[]

    bufferViews: BufferView[]

    accessors: Accessor[]

}

export type Scene = {

    nodes: number[]

}

export type Node = {

    mesh?: number

    children?: number[]

    matrix?: number[]

    translation?: [number, number, number]

    rotation?: [number, number, number, number]

    scale?: [number, number, number]

}

export type BufferRef = {

    uri:string

    byteLength: number

}

export type BufferView = {
    
    buffer: number;

    byteLength: number;

    byteOffset?: number;

    byteStride?: number
    
    target?: WebGLRenderingContext["ARRAY_BUFFER" | "ELEMENT_ARRAY_BUFFER"]
    
}

export type Accessor = {

    bufferView?: number

    byteOffset?: number

    componentType:
        typeof WebGLRenderingContext.BYTE |
        typeof WebGLRenderingContext.UNSIGNED_BYTE |
        typeof WebGLRenderingContext.SHORT |
        typeof WebGLRenderingContext.UNSIGNED_SHORT |
        typeof WebGLRenderingContext.INT |
        typeof WebGLRenderingContext.UNSIGNED_INT |
        typeof WebGLRenderingContext.FLOAT

    normalized?: boolean

    count: number

    type: "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4",

    min?: number[],

    max?: number[]

}

export type Mesh = {

    primitives: MeshPrimitive[]

}

export type MeshPrimitive = {

    mode?: 
        typeof WebGLRenderingContext.POINTS |
        typeof WebGLRenderingContext.LINES |
        typeof WebGLRenderingContext.LINE_LOOP |
        typeof WebGLRenderingContext.LINE_STRIP |
        typeof WebGLRenderingContext.TRIANGLES |
        typeof WebGLRenderingContext.TRIANGLE_STRIP |
        typeof WebGLRenderingContext.TRIANGLE_FAN
    
    indices?: number

    attributes: {
        [attributeName: string]: number
    }

}

export interface Renderer<I, A> {

    newIndicesBuffer(byteOffset: number, byteLength: number, data: ArrayBufferLike): I

    newAttributesBuffer(byteStride: number, byteOffset: number, byteLength: number, data: ArrayBufferLike): A

    deleteBuffer(buffer: I | A): void

    bind(attribute: string, buffer: A, byteOffset: number, normalized: boolean, variableInfo: VariableInfo): void

    bindIndices(buffer: I): void

    setToZero(attribute: string): void

    setIndexComponentType(componentType: GLenum): void

    draw(componentType: GLenum, mode: GLenum, count: number, byteOffset: number): void

    drawIndexed(mode: GLenum, count: number, byteOffset: number): void

    positionsMat: Mat<4>

    normalsMat: Mat<4>

}

export class GLRenderer implements Renderer<IndicesBuffer, AttributesBuffer> {

    constructor(
        private context: Context, 
        private attributes: Record<string, Attribute>, 
        private positionsMatUniform: Uniform, 
        private normalsMatUniform: Uniform
    ) {        
    }

    newIndicesBuffer(byteOffset: number, byteLength: number, data: ArrayBuffer): IndicesBuffer {
        const buffer = this.context.newIndicesBuffer()
        buffer.data = new Uint8Array(data, byteOffset, byteLength)
        return buffer
    }

    newAttributesBuffer(byteStride: number, byteOffset: number, byteLength: number, data: ArrayBuffer): AttributesBuffer {
        const buffer = this.context.newAttributesBuffer(byteStride)
        buffer.data = new Uint8Array(data, byteOffset, byteLength)
        return buffer
    }

    deleteBuffer(buffer: Buffer): void {
        buffer.delete()
    }

    bind(attributeName: string, buffer: AttributesBuffer, byteOffset: number, normalized: boolean, variableInfo: VariableInfo): void {
        const attribute = this.attributes[attributeName]
        if (attribute) {
            attribute.pointTo(buffer, byteOffset, normalized, variableInfo)
        }
    }

    bindIndices(buffer: IndicesBuffer): void {
        buffer.bind()
    }

    setToZero(attributeName: string): void {
        const attribute = this.attributes[attributeName]
        if (attribute instanceof AttributesBuffer) {
            attribute.setTo(0)
        }
    }

    setIndexComponentType(componentType: number): void {
        if (componentType === WebGLRenderingContext.UNSIGNED_INT) {
            const ext = this.context.gl.getExtension('OES_element_index_uint')
            if (!ext) {
                failure("OES_element_index_uint extension is not supported")
            }
        }
    }

    draw(componentType: number, mode: number, count: number, byteOffset: number): void {
        this.context.gl.drawElements(mode, count, componentType, byteOffset)
    }

    drawIndexed(mode: number, count: number, byteOffset: number): void {
        this.context.gl.drawArrays(mode, byteOffset, count)
    }

    get positionsMat(): Mat<4> {
        return asMat(this.positionsMatUniform.data)
    }

    set positionsMat(mat: Mat<4>) {
        this.positionsMatUniform.data = mat4.columnMajorArray(mat)
    }

    get normalsMat(): Mat<4> {
        return asMat(this.normalsMatUniform.data)
    }

    set normalsMat(mat: Mat<4>) {
        this.normalsMatUniform.data = mat4.columnMajorArray(mat)
    }

} 

type SideEffect = () => void

async function fetchBuffer(bufferRef: BufferRef, baseUri: string): Promise<ArrayBuffer> {
    const url = new URL(bufferRef.uri, baseUri)
    const response = await fetch(url.href)
    const arrayBuffer = await response.arrayBuffer()
    return arrayBuffer.byteLength == bufferRef.byteLength ? 
        arrayBuffer : 
        failure(`Buffer at '${bufferRef.uri}' does not have expected length of ${bufferRef.byteLength} bytes!`)
}

class ActiveBufferView<I, A> {

    readonly buffer: I | A

    constructor(bufferView: BufferView, buffers: ArrayBufferLike[], indices: boolean, private renderer: Renderer<I, A>) {
        this.buffer = indices ?
            renderer.newIndicesBuffer(bufferView.byteOffset ?? 0, bufferView.byteLength, buffers[bufferView.buffer]) :
            renderer.newAttributesBuffer(bufferView.byteStride ?? 0, bufferView.byteOffset ?? 0, bufferView.byteLength, buffers[bufferView.buffer])
    }

    delete() {
        this.renderer.deleteBuffer(this.buffer)
    }

}

class ActiveAccessor<I, A> {

    readonly bindTo: (attribute: string) => void
    readonly bindToIndex: () => void
    
    constructor(renderer: Renderer<I, A>, readonly accessor: Accessor, bufferViews: ActiveBufferView<I, A>[]) {
        if (accessor.bufferView !== undefined) {
            const buffer = bufferViews[accessor.bufferView].buffer
            const variableInfo = toVariableInfo(accessor)
            const byteOffset = accessor.byteOffset ?? 0
            const normalized = accessor.normalized ?? false
            this.bindTo = attribute => renderer.bind(attribute, buffer as A, byteOffset, normalized, variableInfo)
            this.bindToIndex = () => renderer.bindIndices(buffer as I)
        } else {
            this.bindTo = attribute => renderer.setToZero(attribute)
            this.bindToIndex = () => failure("Should never reach this!")
        }
    }

}

export interface RenderSubject {

    render(matrix: Mat<4>, normalsMatrix?: Mat<4>): void

    readonly min: Vec<3>
    readonly max: Vec<3>

    readonly hasMesh: boolean

}

export class ActiveModel<I, A> implements RenderSubject {
    
    readonly bufferViews: ActiveBufferView<I, A>[]
    readonly scenes: ActiveScene<I, A>[]
    readonly defaultScene: ActiveScene<I, A>
    readonly min: Vec<3>
    readonly max: Vec<3>
    readonly hasMesh: boolean

    private constructor(model: Model, buffers: ArrayBufferLike[], renderer: Renderer<I, A>) {
        const indices = new Set<number>()
        model.meshes
            .forEach(mesh => mesh.primitives
                .filter(p => p.indices !== undefined)
                .map(p => model.accessors[p.indices ?? -1])
                .forEach(accessor => indices.add(accessor.bufferView ?? -1))
            )
        this.bufferViews = model.bufferViews.map((bufferView, i) => new ActiveBufferView(bufferView, buffers, indices.has(i), renderer))
        const accessors = model.accessors.map(accessor => new ActiveAccessor(renderer, accessor, this.bufferViews))
        const meshes = model.meshes.map(mesh => new ActiveMesh(mesh, accessors, renderer))
        const nodes: ActiveNode<I, A>[] = []
        model.nodes.forEach(node => new ActiveNode(node, meshes, nodes))
        this.hasMesh = nodes.some(node => node.hasMesh)
        this.scenes = model.scenes.map(scene => new ActiveScene(scene, nodes))
        this.defaultScene = this.scenes[model.scene ?? 0]
        this.min = this.defaultScene.min
        this.max = this.defaultScene.max
    }

    static async create<I, A>(modelUri: string, renderer: Renderer<I, A>) {
        const response = await fetch(modelUri, {mode : "cors"})
        const model = await response.json() as Model
        const buffers: ArrayBufferLike[] = new Array<ArrayBufferLike>(model.buffers.length)
        for (let i = 0; i < buffers.length; i++) {
            buffers[i] = await fetchBuffer(model.buffers[i], modelUri)
        }
        return new ActiveModel(model, buffers, renderer)
    }

    render(positionsMatrix: Mat<4>, normalsMatrix: Mat<4> = positionsMatrix): void {
        this.defaultScene.render(positionsMatrix, normalsMatrix)
    }

    delete() {
        this.bufferViews.forEach(bufferView => bufferView.delete())
    }

}

export class ActiveScene<I, A> implements RenderSubject {

    private nodes: ActiveNode<I, A>[]
    readonly min: Vec<3>
    readonly max: Vec<3>
    readonly hasMesh: boolean

    readonly positionsMat: Mat<4>
    readonly normalsMat: Mat<4>

    constructor(scene: Scene, nodes: ActiveNode<I, A>[]) {
        this.nodes = scene.nodes.map(child => nodes[child])
        const nodesWithMeshes = this.nodes.filter(node => node.hasMesh)
        this.hasMesh = nodesWithMeshes.length > 0
        this.min = this.hasMesh ? nodesWithMeshes.map(node => node.min).reduce((prev, curr) => vec3.min(prev, curr)) : [-1, -1, -1]
        this.max = this.hasMesh ? nodesWithMeshes.map(node => node.max).reduce((prev, curr) => vec3.max(prev, curr)) : [+1, +1, +1]

        const s = [
            2 / Math.abs(this.max[0] - this.min[0]),
            2 / Math.abs(this.max[1] - this.min[1]),
            2 / Math.abs(this.max[2] - this.min[2]),
        ].reduce((a, b) => Math.min(a, b))
        this.positionsMat = mat4.mul(
            mat4.scaling(s, s, s), 
            mat4.translation([
                -(this.min[0] + this.max[0]) / 2,
                -(this.min[1] + this.max[1]) / 2,
                -(this.min[2] + this.max[2]) / 2,
            ]),
        )
        this.normalsMat = this.positionsMat; // mat4.transpose(mat4.inverse(this.positionsMat))
    }

    render(positionsMatrix: Mat<4>, normalsMatrix: Mat<4> = positionsMatrix) {
        const positionsMat = mat4.mul(positionsMatrix, this.positionsMat)
        const normalsMat = mat4.mul(normalsMatrix, this.normalsMat)
        for (let node of this.nodes) {
            node.render(positionsMat, normalsMat)
        }
    }

}

class ActiveNode<I, A> implements RenderSubject {

    private children: Supplier<RenderSubject[]>
    private positionsMatrix: Mat<4> 
    private normalsMatrix: Mat<4> 

    readonly _min: Supplier<Vec<3>>
    readonly _max: Supplier<Vec<3>>
    readonly hasMesh: boolean

    constructor(node: Node, meshes: ActiveMesh<I, A>[], nodes: RenderSubject[]) {
        this.hasMesh = node.mesh !== undefined
        this.children = lazily(() => {
            const children = node.children !== undefined ? node.children.map(child => nodes[child]) : []
            if (node.mesh !== undefined) {
                children.push(meshes[node.mesh])
            }
            return children
        })
        this.positionsMatrix = node.matrix !== undefined ? 
            asMat(node.matrix) : 
            mat4.identity()
        this.positionsMatrix = node.translation !== undefined ? 
            mat4.mul(this.positionsMatrix, mat4.translation(node.translation)) :
            this.positionsMatrix 
        this.positionsMatrix = node.rotation !== undefined ? 
            mat4.mul(this.positionsMatrix, mat4.cast(quat.toMatrix(node.rotation))) :
            this.positionsMatrix 
        this.positionsMatrix = node.scale !== undefined ? 
            mat4.mul(this.positionsMatrix, mat4.scaling(...node.scale)) :
            this.positionsMatrix
        this.normalsMatrix = this.positionsMatrix // mat4.transpose(mat4.inverse(this.matrix)) 
        const minMax: Supplier<[Vec<3>, Vec<3>]> = lazily(() => minMaxPos(
            this.positionsMatrix,
            this.hasMesh ? 
                this.children().filter(node => node.hasMesh).map(node => node.min).reduce((prev, curr) => vec3.min(prev, curr)) : 
                [-1, -1, -1],
            this.hasMesh ? 
                this.children().filter(node => node.hasMesh).map(node => node.max).reduce((prev, curr) => vec3.max(prev, curr)) :
                [+1, +1, +1] 
        ))
        this._min = lazily(() => minMax()[0])
        this._max = lazily(() => minMax()[1])
        nodes.push(this)
    }

    get min(): Vec<3> {
        return this._min()
    }

    get max(): Vec<3> {
        return this._max()
    }

    render(parentPositionsMatrix: Mat<4>, parentNormalsMatrix: Mat<4> = parentPositionsMatrix) {
        const positionsMatrix = mat4.mul(parentPositionsMatrix, this.positionsMatrix)
        const normalsMatrix = mat4.mul(parentNormalsMatrix, this.normalsMatrix)
        for (let child of this.children()) {
            child.render(positionsMatrix, normalsMatrix)
        }
    }

}

function minMaxPos(mat: Mat<4>, min: Vec<3>, max: Vec<3>): [Vec<3>, Vec<3>] {
    let positions: Vec<4>[] = [
        [min[0], min[1], min[2], 1],
        [min[0], min[1], max[2], 1],
        [min[0], max[1], min[2], 1],
        [min[0], max[1], max[2], 1],
        [max[0], min[1], min[2], 1],
        [max[0], min[1], max[2], 1],
        [max[0], max[1], min[2], 1],
        [max[0], max[1], max[2], 1],
    ]
    positions = positions.map(p => mat4.apply(mat, p))
    const minPos = positions.reduce((prev, curr) => vec4.min(prev, curr))
    const maxPos = positions.reduce((prev, curr) => vec4.max(prev, curr))
    return [
        [minPos[0], minPos[1], minPos[2]],
        [maxPos[0], maxPos[1], maxPos[2]],
    ]
}

class ActiveMesh<I, A> implements RenderSubject {

    private primitives: ActiveMeshPrimitive<I, A>[]
    readonly min: Vec<3>
    readonly max: Vec<3>
    readonly hasMesh = true

    constructor(
        mesh: Mesh,
        accessors: ActiveAccessor<I, A>[], 
        private renderer: Renderer<I, A>
    ) {
        this.primitives = mesh.primitives.map(primitive => new ActiveMeshPrimitive(primitive, accessors, renderer))
        this.min = this.primitives.map(primitive => primitive.min).reduce((prev, curr) => vec3.min(prev, curr))
        this.max = this.primitives.map(primitive => primitive.max).reduce((prev, curr) => vec3.max(prev, curr))
    }

    render(parentPositionsMatrix: Mat<4>, parentNormalsMatrix: Mat<4> = parentPositionsMatrix) {
        this.renderer.positionsMat = parentPositionsMatrix
        this.renderer.normalsMat = parentNormalsMatrix
        for (const primitive of this.primitives) {
            primitive.render()
        }
    }

}

class ActiveMeshPrimitive<I, A> {

    private sideEffects: SideEffect[] = []
    readonly min: Vec<3>
    readonly max: Vec<3>

    constructor(
        meshPrimitive: MeshPrimitive, 
        accessors: ActiveAccessor<I, A>[], 
        renderer: Renderer<I, A>
    ) {
        const accessor = accessors[meshPrimitive.attributes["POSITION"]].accessor
        this.min = accessor.min ? [accessor.min[0], accessor.min[1], accessor.min[2]] : [-1, -1, -1]
        this.max = accessor.max ? [accessor.max[0], accessor.max[1], accessor.max[2]] : [+1, +1, +1]
        const indicesAccessor = meshPrimitive.indices !== undefined ? accessors[meshPrimitive.indices] : null 
        let count = indicesAccessor ? indicesAccessor.accessor.count : Number.MAX_SAFE_INTEGER 
        for (let attributeName in meshPrimitive.attributes) {
            const accessorIndex = meshPrimitive.attributes[attributeName]
            const accessor = accessors[accessorIndex]
            this.sideEffects.push(() => accessor.bindTo(attributeName))
            if (!indicesAccessor && accessor.accessor.count < count) {
                count = accessor.accessor.count
            }
        }
        count %= Number.MAX_SAFE_INTEGER
        if (indicesAccessor) {
            renderer.setIndexComponentType(indicesAccessor.accessor.componentType)
            this.sideEffects.push(indicesAccessor.bindToIndex)
        }
        const mode = meshPrimitive.mode !== undefined ? meshPrimitive.mode : WebGLRenderingContext.TRIANGLES
        this.sideEffects.push(indicesAccessor ?
            () => renderer.draw(indicesAccessor.accessor.componentType, mode, count, indicesAccessor.accessor.byteOffset ?? 0) :
            () => renderer.drawIndexed(mode, count, 0)
        )
    }

    render(): void {
        for (let sideEffect of this.sideEffects) {
            sideEffect()
        }
    }
    
}

function toVariableInfo(accessor: Accessor): VariableInfo {
    const result = asVariableInfo({
        name: "attribute",
        size: 1,
        type: glTypeOf(accessor)
    }, accessor.componentType)
    return result
}

function glTypeOf(accessor: Accessor) {
    switch (accessor.type) {
        case "SCALAR": return accessor.componentType
        case "VEC2": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC2 : WebGLRenderingContext.INT_VEC2  
        case "VEC3": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC3 : WebGLRenderingContext.INT_VEC3  
        case "VEC4": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC4 : WebGLRenderingContext.INT_VEC4  
        case "MAT2": return WebGLRenderingContext.FLOAT_MAT2  
        case "MAT3": return WebGLRenderingContext.FLOAT_MAT3  
        case "MAT4": return WebGLRenderingContext.FLOAT_MAT4  
    }
}

function asVec(array: number[] | Float32Array | Float64Array, offset: number = 0): Vec<4> {
    return [...array.slice(offset, offset + 4)] as Vec<4>
}

function asMat(array: number[] | Float32Array | Float64Array, offset: number = 0): Mat<4> {
    return [
        asVec(array, offset +  0),
        asVec(array, offset +  4),
        asVec(array, offset +  8),
        asVec(array, offset + 12)
    ]
}

