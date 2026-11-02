import { vec3 } from "aether";
export function createModel(name, vertices) {
    const indexedVertices = indexVertices(vertices);
    return {
        model: createModelJson(name, indexedVertices),
        binary: createBinaryBuffer(indexedVertices)
    };
}
function createModelJson(name, indexedVertices) {
    const verticesCount = indexedVertices.indices.length;
    const uniqueVerticesCount = indexedVertices.vertices.length / 6;
    const intScalarSize = uniqueVerticesCount > 0xFFFF ? 4 : 2;
    const totalIndicesSize = verticesCount * intScalarSize;
    const byteStride = 6 * 4;
    const totalVerticesSize = uniqueVerticesCount * byteStride;
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
        materials: [{
                pbrMetallicRoughness: {
                    metallicFactor: 0.5,
                    roughnessFactor: 0.5
                },
                doubleSided: true
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
    };
}
function createBinaryBuffer(indexedVertices) {
    const uniqueVerticesCount = indexedVertices.vertices.length / 6;
    const intScalarSize = uniqueVerticesCount > 0xFFFF ? 4 : 2;
    const binaryBuffer = new ArrayBuffer(indexedVertices.indices.length * intScalarSize + indexedVertices.vertices.length * 4);
    const indicesView = intScalarSize == 2
        ? new Uint16Array(binaryBuffer, 0, indexedVertices.indices.length)
        : new Uint32Array(binaryBuffer, 0, indexedVertices.indices.length);
    const verticesView = new Float32Array(binaryBuffer, indicesView.byteLength);
    indicesView.set(indexedVertices.indices);
    verticesView.set(indexedVertices.vertices);
    return binaryBuffer;
}
function indexVertices(vertices) {
    const indexedVertices = {
        indices: [],
        vertices: [],
        minPos: [2, 2, 2],
        maxPos: [-2, -2, -2]
    };
    const map = {};
    const stride = 6;
    for (let i = 0; i < vertices.length; i += stride) {
        const position = vec3.from(vertices, i);
        const normal = vec3.from(vertices, i + 3);
        const nextIndex = indexedVertices.vertices.length / stride;
        const index = lookUp(map, position, nextIndex);
        if (index == nextIndex) {
            const unitNormal = vec3.unit(normal);
            indexedVertices.vertices.push(...position, ...unitNormal);
            indexedVertices.minPos = vec3.min(position, indexedVertices.minPos);
            indexedVertices.maxPos = vec3.max(position, indexedVertices.maxPos);
        }
        indexedVertices.indices.push(index);
    }
    return indexedVertices;
}
function lookUp(map, position, defaultIndex) {
    let subMap = map;
    for (const component of position) {
        let subSubMap = subMap[component];
        if (subSubMap === undefined) {
            subSubMap = {};
            subMap[component] = subSubMap;
        }
        subMap = subSubMap;
    }
    if (subMap.index === undefined) {
        subMap.index = defaultIndex;
    }
    return subMap.index;
}
//# sourceMappingURL=gltf.gen.js.map