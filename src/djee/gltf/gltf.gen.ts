import * as aether from "aether"
import * as gltf from "./gltf.js"

type VerticesMap = {
    [component: number]: VerticesMap | undefined
    index?: number
}

type IndexedVertices = {
    indices: number[],
    vertices: number[],
    minPos: number[],
    maxPos: number[]
}

type ModelAndBinary = {
    model: gltf.Model,
    binary: ArrayBuffer
}

export function createModel(name: string, vertices: Float32Array): ModelAndBinary {
    const indexedVertices: IndexedVertices = indexVertices(vertices)
    return {
        model: createModelJson(name, indexedVertices),
        binary: createBinaryBuffer(indexedVertices)
    }
}

function createModelJson(name: string, indexedVertices: IndexedVertices): gltf.Model {
    const verticesCount = indexedVertices.indices.length
    const uniqueVerticesCount = indexedVertices.vertices.length / 6
    const intScalarSize = uniqueVerticesCount > 0xFFFF ? 4 : 2
    const totalIndicesSize = verticesCount * intScalarSize
    const byteStride = 6 * 4
    const totalVerticesSize = uniqueVerticesCount * byteStride
    return {
        asset: {
            version: "2.0"
        },
        scenes: [{
            nodes: [0]
        }],
        nodes: [{
            mesh: 0
        }],
        meshes: [{
            primitives: [{
                indices: 0,
                attributes: {
                    "POSITION": 1,
                    "NORMAL": 2
                }
            }]
        }],
        accessors: [{
            type: "SCALAR",
            componentType: intScalarSize == 2 ? 
                WebGL2RenderingContext.UNSIGNED_SHORT : 
                WebGL2RenderingContext.UNSIGNED_INT,
            bufferView: 0,
            count: verticesCount
        }, {
            type: "VEC3",
            componentType: WebGL2RenderingContext.FLOAT,
            bufferView: 1,
            count: uniqueVerticesCount,
            byteOffset: 0,
            min: indexedVertices.minPos,
            max: indexedVertices.maxPos
        }, {
            type: "VEC3",
            componentType: WebGL2RenderingContext.FLOAT,
            bufferView: 1,
            count: uniqueVerticesCount,
            byteOffset: byteStride / 2
        }],
        bufferViews: [{
            buffer: 0,
            byteOffset: 0,
            byteLength: totalIndicesSize
        }, {
            buffer: 0,
            byteOffset: totalIndicesSize,
            byteLength: totalVerticesSize,
            byteStride: byteStride
        }],
        buffers: [{
            uri: `./${name}.bin`,
            byteLength: totalIndicesSize + totalVerticesSize
        }]
    }
}

function createBinaryBuffer(indexedVertices: IndexedVertices) {
    const uniqueVerticesCount = indexedVertices.vertices.length / 6
    const intScalarSize = uniqueVerticesCount > 0xFFFF ? 4 : 2
    const binaryBuffer = new ArrayBuffer(indexedVertices.indices.length * intScalarSize + indexedVertices.vertices.length * 4)
    const indicesView = intScalarSize == 2 
        ? new Uint16Array(binaryBuffer, 0, indexedVertices.indices.length)
        : new Uint32Array(binaryBuffer, 0, indexedVertices.indices.length)
    const verticesView = new Float32Array(binaryBuffer, indicesView.byteLength)
    indicesView.set(indexedVertices.indices)
    verticesView.set(indexedVertices.vertices)
    return binaryBuffer
}

function indexVertices(vertices: Float32Array) {
    const indexedVertices: IndexedVertices = {
        indices: [],
        vertices: [],
        minPos: [2, 2, 2],
        maxPos: [-2, -2, -2]
    }
    const map: VerticesMap = {}
    const stride = 6
    for (let i = 0; i < vertices.length; i += stride) {
        const vertex = vertices.slice(i, i + stride)
        const position = vertex.slice(0, 3)
        const normal = vertex.slice(3, 6)
        const nextIndex = indexedVertices.vertices.length / stride
        const index = lookUp(map, position, nextIndex)
        if (index == nextIndex) {
            const unitNormal = aether.vec3.unit([normal[0], normal[1], normal[2]])
            indexedVertices.vertices.push(...position, ...unitNormal)
            indexedVertices.minPos = [
                Math.min(position[0], indexedVertices.minPos[0]),
                Math.min(position[1], indexedVertices.minPos[1]),
                Math.min(position[2], indexedVertices.minPos[2])
            ]
            indexedVertices.maxPos = [
                Math.max(position[0], indexedVertices.maxPos[0]),
                Math.max(position[1], indexedVertices.maxPos[1]),
                Math.max(position[2], indexedVertices.maxPos[2])
            ]
        }
        indexedVertices.indices.push(index)
    }
    return indexedVertices
}

function lookUp(map: VerticesMap, position: Float32Array | Int32Array | Int16Array | Int8Array | Uint32Array | Uint16Array | Uint8Array, defaultIndex: number) {
    let subMap: VerticesMap = map
    for (const component of position) {
        let subSubMap = subMap[component]
        if (subSubMap === undefined) {
            subSubMap = {}
            subMap[component] = subSubMap
        }
        subMap = subSubMap
    }
    if (subMap.index === undefined) {
        subMap.index = defaultIndex
    }
    return subMap.index
}
