import * as aether from "aether";
import { failure } from "../utils.js";
import * as graph from "../gltf/gltf.graph.js";
// Layout of Zero Vertex Buffer (for missing vertex attributes)
const ZERO_VERTEX_BUFFER_STRIDE = 22 * 4;
const ZERO_VERTEX_BUFFER_LAYOUT = {
    POSITION: { type: "VEC3", offset: 0 * 4 },
    NORMAL: { type: "VEC3", offset: 4 * 4 },
    //  TANGENT                    : { type: "VEC3", offset:  8 * 4},
    TEXCOORD_BASE_COLOR: { type: "VEC2", offset: 12 * 4 },
    TEXCOORD_METALLIC_ROUGHNESS: { type: "VEC2", offset: 14 * 4 },
    TEXCOORD_TEXCOORD_EMISSIVE: { type: "VEC2", offset: 16 * 4 },
    TEXCOORD_TEXCOORD_OCCLUSION: { type: "VEC2", offset: 18 * 4 },
    //  TEXCOORD_TEXCOORD_NORMAL   : { type: "VEC2", offset: 20 * 4},
};
export class GLTFRenderer {
    constructor(model, adapter, whiteImage) {
        this.model = model;
        this.adapter = adapter;
        this.whiteImage = whiteImage;
        this.resources = [];
        // Zero Vertex Buffer must be initialized first!
        const maxCount = Math.max(...model.accessors.map(a => a.count));
        this.zeroVertexBuffer = adapter.vertexBuffer(new DataView(new ArrayBuffer(maxCount * ZERO_VERTEX_BUFFER_STRIDE)), ZERO_VERTEX_BUFFER_STRIDE);
        this.nodeLevelRenderingRoutines = this.createNodeLevelRenderingRoutines();
        this.primitiveLevelRenderingRoutines = this.createPrimitiveLevelRenderingRoutines();
    }
    static async create(model, adapter) {
        const whiteImage = await onePixelImage(1, 1, 1, 1);
        return new GLTFRenderer(model, adapter, whiteImage);
    }
    destroy() {
        while (this.resources.length > 0) {
            this.resources.pop()?.destroy();
        }
    }
    createNodeLevelRenderingRoutines() {
        const data = collectNodeLevelData(this.model.scene);
        const resources = this.adapter.nodeLevelResources(data.matrices);
        this.resources.push(resources);
        const mapping = data.mappings[0];
        const binder = mapping.matrixIndex !== null
            ? this.adapter.nodeLevelBinder(resources, mapping.matrixIndex)
            : () => { };
        const routines = [this.createNodeLevelRenderingRoutine(mapping.node, binder)];
        for (let i = 1; i < data.mappings.length; i++) {
            const mapping = data.mappings[i];
            const binder = mapping.matrixIndex !== null && mapping.matrixIndex !== data.mappings[i - 1].matrixIndex
                ? this.adapter.nodeLevelBinder(resources, mapping.matrixIndex)
                : () => { };
            routines.push(this.createNodeLevelRenderingRoutine(mapping.node, binder));
        }
        return routines;
    }
    createNodeLevelRenderingRoutine(node, binder) {
        return node instanceof graph.Scene ? binder : renderer => this.renderNode(renderer, node, binder);
    }
    createPrimitiveLevelRenderingRoutines() {
        const buffers = this.gpuBuffers();
        const materials = this.gpuMaterials();
        const resources = this.adapter.primitiveLevelResources(materials);
        this.resources.push(resources);
        const meshRoutines = [];
        for (const mesh of this.model.meshes) {
            const primitiveRoutines = [];
            meshRoutines.push(primitiveRoutines);
            for (const primitive of mesh.primitives) {
                const renderer = this.createPrimitiveLevelRenderingRoutine(primitive, buffers, resources);
                primitiveRoutines.push(renderer);
            }
        }
        return meshRoutines;
    }
    createPrimitiveLevelRenderingRoutine(primitive, buffers, resources) {
        const index = this.asIndex(primitive, buffers);
        const attributes = Object.keys(ZERO_VERTEX_BUFFER_LAYOUT)
            .map(key => this.vertexAttribute(key, primitive, buffers));
        return this.adapter.primitiveLevelRenderingRoutine(primitive.count, primitive.mode, resources, primitive.material.index, attributes, index);
    }
    vertexAttribute(name, primitive, buffers) {
        const key = Object.keys(primitive.attributes).find(k => this.semanticallyIs(name, k, primitive));
        const accessor = primitive.attributes[key ?? "UNKNOWN"];
        return accessor === undefined
            ? {
                name,
                type: ZERO_VERTEX_BUFFER_LAYOUT[name].type,
                offset: ZERO_VERTEX_BUFFER_LAYOUT[name].offset,
                stride: ZERO_VERTEX_BUFFER_STRIDE,
                componentType: WebGL2RenderingContext.FLOAT,
                normalized: false,
                buffer: this.zeroVertexBuffer,
            }
            : {
                name,
                type: accessor.type,
                componentType: accessor.componentType,
                offset: accessor.byteOffset,
                stride: accessor.bufferView.byteStride,
                normalized: accessor.normalized,
                buffer: (buffers.get(accessor.bufferView) ?? this.zeroVertexBuffer),
            };
    }
    semanticallyIs(attributeName, key, primitive) {
        const m = primitive.material;
        switch (attributeName) {
            case "POSITION":
            case "NORMAL": return attributeName === key;
            case "TEXCOORD_BASE_COLOR": return m.baseColorTexture !== null && `TEXCOORD_${m.baseColorTexture.texCoord}` === key;
            case "TEXCOORD_METALLIC_ROUGHNESS": return m.metallicRoughnessTexture !== null && `TEXCOORD_${m.metallicRoughnessTexture.texCoord}` === key;
            case "TEXCOORD_TEXCOORD_EMISSIVE": return m.emissiveTexture !== null && `TEXCOORD_${m.emissiveTexture.texCoord}` === key;
            case "TEXCOORD_TEXCOORD_OCCLUSION": return m.occlusionTexture !== null && `TEXCOORD_${m.occlusionTexture.texCoord}` === key;
            case "UNKNOWN": return true;
        }
    }
    asIndex(primitive, buffers) {
        return primitive.indices !== null ? {
            componentType: primitive.indices.componentType,
            offset: primitive.indices.byteOffset,
            buffer: (buffers.get(primitive.indices.bufferView) ?? failure("Missing index buffer!")),
        } : null;
    }
    gpuBuffers() {
        const buffers = new Map();
        for (const bufferView of this.model.bufferViews) {
            const dataView = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
            const buffer = bufferView.index ?
                this.adapter.indexBuffer(dataView, bufferView.byteStride) :
                this.adapter.vertexBuffer(dataView, bufferView.byteStride);
            this.resources.push(buffer);
            buffers.set(bufferView, buffer);
        }
        return buffers;
    }
    gpuMaterials() {
        const textures = this.gpuTextures();
        const samplers = this.gpuSamplers();
        const whiteBaseColorTexture = this.adapter.texture(this.whiteImage, false);
        const whiteBaseColorSampler = this.adapter.sampler(new graph.Sampler({}, 0));
        const whiteMetallicRoughnessTexture = this.adapter.texture(this.whiteImage, true);
        const whiteMetallicRoughnessSampler = this.adapter.sampler(new graph.Sampler({}, 0));
        const whiteEmissiveTexture = this.adapter.texture(this.whiteImage, false);
        const whiteEmissiveSampler = this.adapter.sampler(new graph.Sampler({}, 0));
        const materials = this.model.materials.map(m => ({
            baseColorFactor: m.baseColorFactor,
            baseColorTexture: m.baseColorTexture !== null ? [
                textures.get(m.baseColorTexture.texture.source) ?? whiteBaseColorTexture,
                samplers.get(m.baseColorTexture.texture.sampler) ?? whiteBaseColorSampler,
            ] : [whiteBaseColorTexture, whiteBaseColorSampler],
            metallicFactor: m.metallicFactor,
            roughnessFactor: m.roughnessFactor,
            metallicRoughnessTexture: m.metallicRoughnessTexture !== null ? [
                textures.get(m.metallicRoughnessTexture.texture.source) ?? whiteMetallicRoughnessTexture,
                samplers.get(m.metallicRoughnessTexture.texture.sampler) ?? whiteMetallicRoughnessSampler,
            ] : [whiteMetallicRoughnessTexture, whiteMetallicRoughnessSampler],
            emissiveFactor: m.emissiveFactor,
            emissiveTexture: m.emissiveTexture !== null ? [
                textures.get(m.emissiveTexture.texture.source) ?? whiteEmissiveTexture,
                samplers.get(m.emissiveTexture.texture.sampler) ?? whiteEmissiveSampler,
            ] : [whiteEmissiveTexture, whiteEmissiveSampler],
            occlusionTexture: m.occlusionTexture !== null ? [
                textures.get(m.occlusionTexture.texture.source) ?? whiteBaseColorTexture,
                samplers.get(m.occlusionTexture.texture.sampler) ?? whiteBaseColorSampler,
            ] : [whiteBaseColorTexture, whiteBaseColorSampler],
            alphaCutoff: m.alphaCutoff,
            alphaMode: m.alphaMode,
            doubleSided: m.doubleSided,
        }));
        return materials;
    }
    gpuTextures() {
        const textures = new Map();
        for (const image of this.model.images) {
            const gpuTexture = this.adapter.texture(image.image, image.linear);
            this.resources.push(gpuTexture);
            textures.set(image, gpuTexture);
        }
        return textures;
    }
    gpuSamplers() {
        const samplers = new Map();
        for (const sampler of this.model.samplers) {
            const gpuSampler = this.adapter.sampler(sampler);
            samplers.set(sampler, gpuSampler);
        }
        return samplers;
    }
    render(renderer) {
        for (const routine of this.nodeLevelRenderingRoutines) {
            routine(renderer);
        }
    }
    renderNode(renderer, node, binder) {
        binder(renderer);
        for (const mesh of node.meshes) {
            this.renderMesh(renderer, mesh);
        }
    }
    renderMesh(renderer, mesh) {
        for (const primitive of mesh.primitives) {
            this.renderPrimitive(renderer, primitive);
        }
    }
    renderPrimitive(renderer, primitive) {
        const routine = this.primitiveLevelRenderingRoutines[primitive.meshIndex][primitive.index];
        routine(renderer);
    }
}
async function onePixelImage(r, g, b, a) {
    const array = new Uint8ClampedArray(4);
    array[0] = u8Shade(r);
    array[1] = u8Shade(g);
    array[2] = u8Shade(b);
    array[3] = u8Shade(a);
    const whiteBaseColorImageData = new ImageData(array, 1, 1);
    const whiteBaseColorImage = await createImageBitmap(whiteBaseColorImageData);
    return whiteBaseColorImage;
}
function u8Shade(s) {
    return Math.min(Math.max(Math.round(s * 0xFF), 0), 0xFF);
}
function collectNodeLevelData(scene) {
    const matrix = {
        matrix: aether.mat4.identity(),
        antiMatrix: aether.mat4.identity()
    };
    const resources = {
        matrices: [],
        mappings: [{
                node: scene,
                matrixIndex: null
            }]
    };
    let index = null;
    for (const node of scene.nodes) {
        index = doCollectNodeLevelData(node, matrix, index, resources);
    }
    return resources;
}
function doCollectNodeLevelData(node, parentMatrix, parentIndex, resources) {
    const matrix = node.isIdentityMatrix ? parentMatrix : {
        matrix: aether.mat4.mul(parentMatrix.matrix, node.matrix),
        antiMatrix: aether.mat4.mul(parentMatrix.antiMatrix, node.antiMatrix)
    };
    let index = node.isIdentityMatrix ? parentIndex : null;
    if (index === null && node.meshes.length > 0) {
        index = resources.matrices.length;
        resources.matrices.push(matrix);
    }
    resources.mappings.push({ node, matrixIndex: index });
    for (const child of node.children) {
        index = doCollectNodeLevelData(child, matrix, index, resources);
    }
    return parentIndex === null && node.isIdentityMatrix && index !== null ? index : parentIndex;
}
//# sourceMappingURL=gltf.renderer.js.map