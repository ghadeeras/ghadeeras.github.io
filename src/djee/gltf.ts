import { Attribute } from "./attribute"
import { Buffer, BufferTarget } from "./buffer"
import { Context } from "./context"
import { asVariableInfo, VariableInfo } from "./reflection"
import { Uniform } from "./uniform"
import { failure, lazily, Supplier } from "./utils"

export type Model = {

    scene: number

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

    mesh: number

    children?: number[]

    matrix?: number[]

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

    type: "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4"

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

    [attributeName: string]: Attribute | null | undefined

}

type SideEffect = () => void

class Matrix extends Float64Array {

    constructor() {
        super(16)
    }

    prod(matrix: Matrix): Matrix {
        const result = new Matrix()
        for (let i = 0; i < 16; i++) {
            let left = i & 3
            let right = i - left
            let dot = 0
            while (left < 16) {
                dot += this[left] * matrix[right++]
                left += 4
            }
            result[i] = dot
    
        }
        return result
    }

    static create(components: number[]): Matrix {
        const matrix = new Matrix()
        for (let i = 0; i < matrix.length; i++) {
            matrix[i] = components[i]
        }
        return matrix
    }

    static readonly identity = Matrix.create([
        1, 0, 0, 0, 
        0, 1, 0, 0, 
        0, 0, 1, 0, 
        0, 0, 0, 1
    ])

}

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
    readonly target: BufferTarget

    constructor(bufferView: BufferView, buffers: ArrayBufferLike[], context: Context) {
        this.buffer = context.newBuffer(bufferView.byteStride ?? 0)
        this.buffer.data = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset ?? 0, bufferView.byteLength)
        this.target = bufferView.target == BufferTarget.elementArrayBuffer.id ? BufferTarget.elementArrayBuffer : BufferTarget.arrayBuffer 
    }

}

class ActiveAccessor {

    readonly bindTo: (attribute: Attribute) => void
    readonly bindToIndex: () => void
    
    constructor(readonly accessor: Accessor, bufferViews: ActiveBufferView[]) {
        if (accessor.bufferView) {
            const buffer = bufferViews[accessor.bufferView].buffer
            const variableInfo = toVariableInfo(accessor)
            const byteOffset = accessor.byteOffset ?? 0
            const normalized = accessor.normalized ?? false
            this.bindTo = attribute => attribute.pointTo(buffer, byteOffset, normalized, variableInfo)
            this.bindToIndex = () => BufferTarget.elementArrayBuffer.bind(buffer)
        } else {
            this.bindTo = attribute => attribute.setTo(0)
            this.bindToIndex = () => failure("Should never reach this!")
        }
    }

}

export class ActiveModel {
    
    readonly scenes: ActiveScene[]
    readonly defaultScene: ActiveScene

    private constructor(model: Model, buffers: ArrayBufferLike[], matrixUniform: Uniform, attributesMap: AttributesMap, context: Context) {
        const bufferViews = model.bufferViews.map(bufferView => new ActiveBufferView(bufferView, buffers, context))
        const accessors = model.accessors.map(accessor => new ActiveAccessor(accessor, bufferViews))
        const meshes = model.meshes.map(mesh => new ActiveMesh(mesh, accessors, attributesMap, context))
        const nodes: ActiveNode[] = []
        model.nodes.forEach(node => new ActiveNode(node, meshes, nodes, matrixUniform))
        this.scenes = model.scenes.map(scene => new ActiveScene(scene, nodes))
        this.defaultScene = this.scenes[model.scene]
    }

    static async create(baseUri: string, model: Model, matrixUniform: Uniform, attributesMap: AttributesMap, context: Context) {
        const buffers: ArrayBufferLike[] = new Array<ArrayBufferLike>(model.buffers.length)
        for (let i = 0; i < buffers.length; i++) {
            buffers[i] = await fetchBuffer(model.buffers[i], baseUri)
        }
        return new ActiveModel(model, buffers, matrixUniform, attributesMap, context)
    }

}

export class ActiveScene {

    private nodes: ActiveNode[]

    constructor(scene: Scene, nodes: ActiveNode[]) {
        this.nodes = scene.nodes.map(child => nodes[child])
    }

    render(matView: Matrix) {
        for (let node of this.nodes) {
            node.render(matView)
        }
    }

}

class ActiveNode {

    private mesh: ActiveMesh
    private children: Supplier<ActiveNode[]>
    private matrix: Matrix 

    constructor(node: Node, meshes: ActiveMesh[], nodes: ActiveNode[], private matrixUniform: Uniform) {
        this.mesh = meshes[node.mesh]
        this.children = lazily(() => node.children ? node.children.map(child => nodes[child]) : [])
        this.matrix = node.matrix ? Matrix.create(node.matrix) : Matrix.identity
        nodes.push(this)
    }

    render(parentMatrix: Matrix) {
        const matrix = parentMatrix.prod(this.matrix)
        this.matrixUniform.data = matrix
        this.mesh.render() 
        for (let child of this.children()) {
            child.render(matrix)
        }
    }

}

class ActiveMesh {

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
        const indicesAccessor = meshPrimitive.indices ? accessors[meshPrimitive.indices] : null 
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
        const mode = meshPrimitive.mode ?? WebGLRenderingContext.TRIANGLES
        this.sideEffects.push(indicesAccessor ?
            () => context.gl.drawElements(mode, count, indicesAccessor.accessor.componentType, 0) :
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