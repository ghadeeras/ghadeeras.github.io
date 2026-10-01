import * as aether from "aether"
import { failure } from "../utils.js"

export type Model = {

    asset: {
        version: "2.0"
    }

    scene?: number

    scenes: Scene[]

    nodes: Node[]

    cameras?: Camera[]

    meshes: Mesh[]

    buffers: BufferRef[]

    bufferViews: BufferView[]

    accessors: Accessor[]

    materials?: Material[]

    textures?: Texture[]

    samplers?: Sampler[]

    images?: Image[]

}

export type Scene = {

    nodes: number[]

}

export type Node = {

    camera?: number
    
    mesh?: number

    children?: number[]

    matrix?: number[]

    translation?: aether.Vec3

    rotation?: aether.Quat

    scale?: aether.Vec3

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
    
    target?: WebGL2RenderingContext["ARRAY_BUFFER" | "ELEMENT_ARRAY_BUFFER"]
    
}

export type Accessor = {

    bufferView?: number

    byteOffset?: number

    componentType: ScalarType

    normalized?: boolean

    count: number

    type: ElementType,

    min?: number[],

    max?: number[]

}

export type Texture = {

    sampler?: number

    source: number

}

export type Sampler = {

    magFilter?: number

    minFilter?: number

    wrapS?: number

    wrapT?: number

}

export type Image = 
    | { bufferView: number, mimeType: "image/jpeg" | "image/png"} 
    | { uri: string }

export type Camera = PerspectiveCamera | OrthographicCamera
export type PerspectiveCamera = {
    type: "perspective",
    perspective: {
        aspectRatio?: number,
        yfov: number,
        zfar?: number,
        znear: number,
    }
}
export type OrthographicCamera = {
    type: "orthographic",
    orthographic: {
        xmag: number,
        ymag: number,
        zfar: number,
        znear: number,
    }
}

export type Mesh = {

    primitives: MeshPrimitive[]

}

export type MeshPrimitive = {

    mode?: PrimitiveMode
    
    indices?: number

    material?: number

    attributes: {
        [attributeName: string]: number
    }

}

export type Material = {
        pbrMetallicRoughness?: {
            baseColorFactor?: aether.Vec4,
            baseColorTexture?: TextureInfo,
            metallicFactor?: number,
            roughnessFactor?: number,
            metallicRoughnessTexture?: TextureInfo,
        },
        normalTexture?: TextureInfo,
        occlusionTexture?: TextureInfo,
        emissiveTexture?: TextureInfo,
        emissiveFactor?: aether.Vec3,
        alphaMode?: "OPAQUE" | "MASK" | "BLEND",
        alphaCutoff?: number,
        doubleSided?: boolean
}

export type TextureInfo = {
    index: number,
    texCoord?: number
}

export type PrimitiveMode = WebGL2RenderingContext[
    "POINTS" | 
    "LINES" | 
    "LINE_LOOP" | 
    "LINE_STRIP" | 
    "TRIANGLES" | 
    "TRIANGLE_STRIP" | 
    "TRIANGLE_FAN"
]

export type ScalarType = WebGL2RenderingContext[
    "BYTE" | 
    "UNSIGNED_BYTE" | 
    "SHORT" | 
    "UNSIGNED_SHORT" | 
    "INT" | 
    "UNSIGNED_INT" | 
    "FLOAT"
]

export type ElementType = "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4"

export async function fetchModel(modelUri: string) {
    const response = await fetch(modelUri, { mode: "cors" })
    const model = await response.json() as Model
    const buffers = await fetchBuffers(model.buffers, modelUri)
    const images = await fetchImages(model, model.bufferViews, buffers, modelUri)
    return { model, buffers, images }
}

async function fetchBuffers(bufferRefs: BufferRef[], baseUri: string): Promise<ArrayBuffer[]> {
    const buffers: ArrayBuffer[] = new Array<ArrayBuffer>(bufferRefs.length)
    for (let i = 0; i < buffers.length; i++) {
        buffers[i] = await fetchBuffer(bufferRefs[i], baseUri)
    }
    return buffers
}

async function fetchBuffer(bufferRef: BufferRef, baseUri: string): Promise<ArrayBuffer> {
    const url = new URL(bufferRef.uri, baseUri)
    const response = await fetch(url.href)
    const arrayBuffer = await response.arrayBuffer()
    return arrayBuffer.byteLength == bufferRef.byteLength ? 
        arrayBuffer : 
        failure(`Buffer at '${bufferRef.uri}' does not have expected length of ${bufferRef.byteLength} bytes!`)
}

async function fetchImages(model: Model, bufferViews: BufferView[], buffers: ArrayBuffer[], modelUri: string): Promise<ImageBitmap[]> {
    const images = model.images ?? []
    return Promise.all(images.map(i => fetchImageBitmap(i, bufferViews, buffers, modelUri)))
}

async function fetchImageBitmap(image: Image, bufferViews: BufferView[], buffers: ArrayBuffer[], baseUri: string): Promise<ImageBitmap> {
    try {
        if ("uri" in image) {
            const response = await fetch(new URL(image.uri, baseUri))
            return await createImageBitmap(await response.blob())
        } else {
            const view = bufferViews[image.bufferView]
            const buffer = buffers[view.buffer]
            const blob = new Blob([buffer], { type: image.mimeType })
            return await createImageBitmap(blob)
        }
    } catch (e) {
        console.error(e, image)
        throw e
    }
}

export function matrixOf(node: Node): aether.Mat4 {
    let matrix = node.matrix !== undefined ?
        aether.mat4.from(node.matrix) :
        aether.mat4.identity()
    matrix = node.translation !== undefined ?
        aether.mat4.mul(matrix, aether.mat4.translation(node.translation)) :
        matrix
    matrix = node.rotation !== undefined ?
        aether.mat4.mul(matrix, aether.mat4.cast(aether.quat.toMatrix(node.rotation))) :
        matrix
    matrix = node.scale !== undefined ?
        aether.mat4.mul(matrix, aether.mat4.scaling(...node.scale)) :
        matrix
    return matrix
}

export function enrichBufferViews(model: Model) {
    for (const mesh of model.meshes) {
        for (const primitive of mesh.primitives) {
            if (primitive.indices !== undefined) {
                const accessor = model.accessors[primitive.indices]
                if (accessor.bufferView === undefined) {
                    continue
                }
                const bufferView = model.bufferViews[accessor.bufferView]
                bufferView.target = WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER
                if (bufferView.byteStride === undefined && accessor.componentType == WebGL2RenderingContext.UNSIGNED_BYTE) {
                    bufferView.byteStride = 1
                }
            }
        }
    }
}
