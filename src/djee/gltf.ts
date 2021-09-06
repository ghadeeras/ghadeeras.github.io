import { Mat, mat4, quat, Vec } from "../../ether/latest/index.js"
import { Attribute } from "./attribute.js"
import { AttributesBuffer, Buffer } from "./buffer.js"
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

export type AttributesMap = {

    [attributeName: string]: Attribute | undefined

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

class ActiveBufferView {

    readonly buffer: Buffer

    constructor(bufferView: BufferView, buffers: ArrayBufferLike[], indices: boolean, context: Context) {
        this.buffer = indices ?
            context.newIndicesBuffer() :
            context.newAttributesBuffer(bufferView.byteStride ?? 0)
        this.buffer.data = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset ?? 0, bufferView.byteLength)
    }

    delete() {
        this.buffer.delete()
    }

}

class ActiveAccessor {

    readonly bindTo: (attribute: Attribute) => void
    readonly bindToIndex: () => void
    
    constructor(readonly accessor: Accessor, bufferViews: ActiveBufferView[]) {
        if (accessor.bufferView !== undefined) {
            const buffer = bufferViews[accessor.bufferView].buffer
            const variableInfo = toVariableInfo(accessor)
            const byteOffset = accessor.byteOffset ?? 0
            const normalized = accessor.normalized ?? false
            this.bindTo = attribute => attribute.pointTo(buffer as AttributesBuffer, byteOffset, normalized, variableInfo)
            this.bindToIndex = () => buffer.bind()
        } else {
            this.bindTo = attribute => attribute.setTo(0)
            this.bindToIndex = () => failure("Should never reach this!")
        }
    }

}

export interface RenderSubject {

    render(matrix: Mat<4>): void

}

export class ActiveModel implements RenderSubject {
    
    readonly bufferViews: ActiveBufferView[]
    readonly scenes: ActiveScene[]
    readonly defaultScene: ActiveScene

    private constructor(model: Model, buffers: ArrayBufferLike[], matrixUniform: Uniform, attributesMap: AttributesMap, context: Context) {
        const indices = new Set<number>()
        model.meshes
            .forEach(mesh => mesh.primitives
                .filter(p => p.indices !== undefined)
                .map(p => model.accessors[p.indices ?? -1])
                .forEach(accessor => indices.add(accessor.bufferView ?? -1))
            )
        this.bufferViews = model.bufferViews.map((bufferView, i) => new ActiveBufferView(bufferView, buffers, indices.has(i), context))
        const accessors = model.accessors.map(accessor => new ActiveAccessor(accessor, this.bufferViews))
        const meshes = model.meshes.map(mesh => new ActiveMesh(mesh, accessors, attributesMap, context))
        const nodes: ActiveNode[] = []
        model.nodes.forEach(node => new ActiveNode(node, meshes, nodes, matrixUniform))
        this.scenes = model.scenes.map(scene => new ActiveScene(scene, nodes))
        this.defaultScene = this.scenes[model.scene ?? 0]
    }

    static async create(modelUri: string, matrixUniform: Uniform, attributesMap: AttributesMap, context: Context) {
        const response = await fetch(modelUri, {mode : "cors"})
        const model = await response.json() as Model
        const buffers: ArrayBufferLike[] = new Array<ArrayBufferLike>(model.buffers.length)
        for (let i = 0; i < buffers.length; i++) {
            buffers[i] = await fetchBuffer(model.buffers[i], modelUri)
        }
        return new ActiveModel(model, buffers, matrixUniform, attributesMap, context)
    }

    render(matrix: Mat<4>): void {
        this.defaultScene.render(matrix)
    }

    delete() {
        this.bufferViews.forEach(bufferView => bufferView.delete())
    }

}

export class ActiveScene implements RenderSubject {

    private nodes: ActiveNode[]

    constructor(scene: Scene, nodes: ActiveNode[]) {
        this.nodes = scene.nodes.map(child => nodes[child])
    }

    render(matView: Mat<4>) {
        for (let node of this.nodes) {
            node.render(matView)
        }
    }

}

class ActiveNode implements RenderSubject {

    private children: Supplier<RenderSubject[]>
    private matrix: Mat<4> 

    constructor(node: Node, meshes: ActiveMesh[], nodes: RenderSubject[], private matrixUniform: Uniform) {
        this.children = lazily(() => {
            const children = node.children !== undefined ? node.children.map(child => nodes[child]) : []
            if (node.mesh !== undefined) {
                children.push(meshes[node.mesh])
            }
            return children
        })
        this.matrix = node.matrix !== undefined ? 
            asMat(node.matrix) : 
            mat4.identity()
        this.matrix = node.translation !== undefined ? 
            mat4.mul(this.matrix, mat4.translation(node.translation)) :
            this.matrix 
        this.matrix = node.rotation !== undefined ? 
            mat4.mul(this.matrix, mat4.cast(quat.toMatrix(node.rotation))) :
            this.matrix 
        this.matrix = node.scale !== undefined ? 
            mat4.mul(this.matrix, mat4.scaling(...node.scale)) :
            this.matrix 
        nodes.push(this)
    }

    render(parentMatrix: Mat<4>) {
        const matrix = mat4.mul(parentMatrix, this.matrix)
        this.matrixUniform.data = mat4.columnMajorArray(matrix)
        for (let child of this.children()) {
            child.render(matrix)
        }
        this.matrixUniform.data = mat4.columnMajorArray(parentMatrix)
    }

}

class ActiveMesh implements RenderSubject {

    private primitives: ActiveMeshPrimitive[]

    constructor(
        mesh: Mesh,
        accessors: ActiveAccessor[], 
        attributeMap: AttributesMap,
        context: Context
    ) {
        this.primitives = mesh.primitives.map(primitive => new ActiveMeshPrimitive(primitive, accessors, attributeMap, context))
    }

    render() {
        for (const primitive of this.primitives) {
            primitive.render()
        }
    }

}

class ActiveMeshPrimitive {

    private sideEffects: SideEffect[] = []

    constructor(
        meshPrimitive: MeshPrimitive, 
        accessors: ActiveAccessor[], 
        attributeMap: AttributesMap,
        context: Context
    ) {
        const indicesAccessor = meshPrimitive.indices !== undefined ? accessors[meshPrimitive.indices] : null 
        let count = indicesAccessor ? indicesAccessor.accessor.count : Number.MAX_SAFE_INTEGER 
        for (let attributeName in meshPrimitive.attributes) {
            const attribute = attributeMap[attributeName]
            const accessorIndex = meshPrimitive.attributes[attributeName]
            const accessor = accessors[accessorIndex]
            if (attribute) {
                this.sideEffects.push(() => accessor.bindTo(attribute))
            }
            if (!indicesAccessor && accessor.accessor.count < count) {
                count = accessor.accessor.count
            }
        }
        count %= Number.MAX_SAFE_INTEGER
        if (indicesAccessor) {
            this.sideEffects.push(indicesAccessor.bindToIndex)
        }
        if (indicesAccessor?.accessor.componentType === WebGLRenderingContext.UNSIGNED_INT) {
            const ext = context.gl.getExtension('OES_element_index_uint')
            if (!ext) {
                failure("OES_element_index_uint extension is not supported")
            }
        }
        const mode = meshPrimitive.mode !== undefined ? meshPrimitive.mode : WebGLRenderingContext.TRIANGLES
        this.sideEffects.push(indicesAccessor ?
            () => context.gl.drawElements(mode, count, indicesAccessor.accessor.componentType, indicesAccessor.accessor.byteOffset ?? 0) :
            () => context.gl.drawArrays(mode, 0, count)
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

