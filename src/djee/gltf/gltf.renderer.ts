import * as aether from "aether"
import { Resource } from "lumen";
import { failure } from "../utils.js";
import * as gltf from "../gltf/gltf.js";
import * as graph from "../gltf/gltf.graph.js";

export interface APIAdapter<
    N extends Resource, 
    P extends Resource, 
    T extends Resource, 
    S, 
    V extends Resource, 
    I extends Resource, 
    R
> {

    nodeLevelResources(matrices: Matrix[]): N

    primitiveLevelResources(materials: Material<T, S>[]): P

    vertexBuffer(view: DataView, stride: number): V

    indexBuffer(view: DataView, stride: number): I

    texture(image: ImageBitmap, linear: boolean): T

    sampler(sampler: graph.Sampler): S

    nodeLevelBinder(resources: N, matrixIndex: number): RenderingRoutine<R>

    primitiveLevelRenderingRoutine(count: number, mode: gltf.PrimitiveMode, resources: P, materialIndex: number, attributes: VertexAttribute<V>[], index?: Index<I> | null): RenderingRoutine<R>

}

export type Index<I extends Resource> = {
    componentType: gltf.ScalarType,
    offset: number,
    buffer: I,
}

export type VertexAttribute<V extends Resource> = {
    name: keyof typeof ZERO_VERTEX_BUFFER_LAYOUT | "UNKNOWN",
    type: gltf.ElementType,
    componentType: gltf.ScalarType,
    offset: number,
    stride: number,
    normalized: boolean,
    buffer: V,
}

export type RenderingRoutine<R> = (renderer: R) => void

export type Matrix = {
    matrix: aether.Mat4,
    antiMatrix: aether.Mat4,
}

export type Material<T extends Resource, S> = {
    baseColorFactor: aether.Vec4
    baseColorTexture: [T, S]
    metallicFactor: number
    roughnessFactor: number
    metallicRoughnessTexture: [T, S]
    emissiveFactor: aether.Vec3
    emissiveTexture: [T, S]
    occlusionTexture: [T, S]
    normalTexture: [T, S]
    alphaMode: "OPAQUE" | "MASK" | "BLEND"
    alphaCutoff: number
    doubleSided: boolean
}

// Layout of Zero Vertex Buffer (for missing vertex attributes)
const ZERO_VERTEX_BUFFER_STRIDE = 22 * 4
const ZERO_VERTEX_BUFFER_LAYOUT = {
    POSITION                   : { type: "VEC3", offset:  0 * 4},
    NORMAL                     : { type: "VEC3", offset:  4 * 4},
    TANGENT                    : { type: "VEC3", offset:  8 * 4},
    TEXCOORD_BASE_COLOR        : { type: "VEC2", offset: 12 * 4},
    TEXCOORD_METALLIC_ROUGHNESS: { type: "VEC2", offset: 14 * 4},
    TEXCOORD_TEXCOORD_EMISSIVE : { type: "VEC2", offset: 16 * 4},
    TEXCOORD_TEXCOORD_OCCLUSION: { type: "VEC2", offset: 18 * 4},
    TEXCOORD_TEXCOORD_NORMAL   : { type: "VEC2", offset: 20 * 4},
} as const

export class GLTFRenderer<
    N extends Resource, 
    P extends Resource, 
    T extends Resource, 
    S, 
    V extends Resource, 
    I extends Resource, 
    R
> {

    private zeroVertexBuffer: V

    private nodeLevelRenderingRoutines: RenderingRoutine<R>[]
    private primitiveLevelRenderingRoutines: RenderingRoutine<R>[][]
    
    private resources: Resource[] = []

    private constructor(
        private model: graph.Model, 
        private adapter: APIAdapter<N, P, T, S, V, I, R> ,
        private whiteImage: ImageBitmap,
        private blueImage: ImageBitmap,
    ) {
        // Zero Vertex Buffer must be initialized first!
        const maxCount = Math.max(...model.accessors.map(a => a.count))
        this.zeroVertexBuffer = adapter.vertexBuffer(new DataView(new ArrayBuffer(maxCount * ZERO_VERTEX_BUFFER_STRIDE)), ZERO_VERTEX_BUFFER_STRIDE)

        this.nodeLevelRenderingRoutines = this.createNodeLevelRenderingRoutines()
        this.primitiveLevelRenderingRoutines = this.createPrimitiveLevelRenderingRoutines();
    }

    static async create<
        N extends Resource, 
        P extends Resource, 
        T extends Resource, 
        S, 
        V extends Resource, 
        I extends Resource, 
        R
    >(
        model: graph.Model, 
        adapter: APIAdapter<N, P, T, S, V, I, R> ,
    ): Promise<GLTFRenderer<N, P, T, S, V, I, R>> {
        const whiteImage = await onePixelImage(1, 1, 1, 1);
        const blueImage = await onePixelImage(127.0 / 255.0, 127.0 / 255.0, 1, 1);
        return new GLTFRenderer(model, adapter, whiteImage, blueImage)
    }

    destroy() {
        while (this.resources.length > 0) {
            this.resources.pop()?.destroy()
        }
    }

    private createNodeLevelRenderingRoutines(): RenderingRoutine<R>[] {
        const data = collectNodeLevelData(this.model.scene)
        const resources = this.adapter.nodeLevelResources(data.matrices)
        this.resources.push(resources)

        const mapping  = data.mappings[0]
        const binder   = mapping.matrixIndex !== null 
            ? this.adapter.nodeLevelBinder(resources, mapping.matrixIndex) 
            : () => {}
        const routines = [this.createNodeLevelRenderingRoutine(mapping.node, binder)]
        for (let i = 1; i < data.mappings.length; i++) {
            const mapping = data.mappings[i]
            const binder  = mapping.matrixIndex !== null && mapping.matrixIndex !== data.mappings[i - 1].matrixIndex 
                ? this.adapter.nodeLevelBinder(resources, mapping.matrixIndex) 
                : () => {}
            routines.push(this.createNodeLevelRenderingRoutine(mapping.node, binder))
        }
        return routines
    }

    private createNodeLevelRenderingRoutine(node: graph.Node | graph.Scene, binder: RenderingRoutine<R>): RenderingRoutine<R> {
        return node instanceof graph.Scene ? binder : renderer => this.renderNode(renderer, node, binder)
    }

    private createPrimitiveLevelRenderingRoutines(): typeof this.primitiveLevelRenderingRoutines {
        const buffers = this.gpuBuffers();
        const materials = this.gpuMaterials();
        const resources = this.adapter.primitiveLevelResources(materials)
        this.resources.push(resources)
        const meshRoutines: RenderingRoutine<R>[][] = []
        for (const mesh of this.model.meshes) {
            const primitiveRoutines: RenderingRoutine<R>[] = []
            meshRoutines.push(primitiveRoutines)
            for (const primitive of mesh.primitives) {
                const renderer = this.createPrimitiveLevelRenderingRoutine(primitive, buffers, resources);
                primitiveRoutines.push(renderer);
            }
        }
        return meshRoutines
    }

    private createPrimitiveLevelRenderingRoutine(primitive: graph.Primitive, buffers: Map<graph.BufferView, V | I>, resources: P): RenderingRoutine<R> {
        const index = this.asIndex(primitive, buffers);
        const attributes = Object.keys(ZERO_VERTEX_BUFFER_LAYOUT)
            .map(key => this.vertexAttribute(key as keyof typeof ZERO_VERTEX_BUFFER_LAYOUT, primitive, buffers));
        return this.adapter.primitiveLevelRenderingRoutine(primitive.count, primitive.mode, resources, primitive.material.index, attributes, index)        
    }
    
    private vertexAttribute(name: keyof typeof ZERO_VERTEX_BUFFER_LAYOUT, primitive: graph.Primitive, buffers: Map<graph.BufferView, V | I>) {
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
                buffer: (buffers.get(accessor.bufferView) ?? this.zeroVertexBuffer) as V,
            };
    }

    private semanticallyIs(attributeName: VertexAttribute<V>["name"], key: string, primitive: graph.Primitive): boolean {
        const m = primitive.material
        switch (attributeName) {
            case "POSITION":
            case "NORMAL":
            case "TANGENT": return attributeName === key
            case "TEXCOORD_BASE_COLOR": return m.baseColorTexture !== null && `TEXCOORD_${m.baseColorTexture.texCoord}` === key
            case "TEXCOORD_METALLIC_ROUGHNESS": return m.metallicRoughnessTexture !== null && `TEXCOORD_${m.metallicRoughnessTexture.texCoord}` === key
            case "TEXCOORD_TEXCOORD_EMISSIVE": return m.emissiveTexture !== null && `TEXCOORD_${m.emissiveTexture.texCoord}` === key
            case "TEXCOORD_TEXCOORD_OCCLUSION": return m.occlusionTexture !== null && `TEXCOORD_${m.occlusionTexture.texCoord}` === key
            case "TEXCOORD_TEXCOORD_NORMAL": return m.normalTexture !== null && `TEXCOORD_${m.normalTexture.texCoord}` === key
            case "UNKNOWN": return true
        }
    }
    
    private asIndex(primitive: graph.Primitive, buffers: Map<graph.BufferView, V | I>): Index<I> | null {
        return primitive.indices !== null ? {
            componentType: primitive.indices.componentType,
            offset: primitive.indices.byteOffset,
            buffer: (buffers.get(primitive.indices.bufferView) ?? failure<I>("Missing index buffer!")) as I,
        } : null;
    }
    
    private gpuBuffers() {
        const buffers: Map<graph.BufferView, V | I> = new Map();
        for (const bufferView of this.model.bufferViews) {
            const dataView = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
            const buffer = bufferView.index ? 
                this.adapter.indexBuffer(dataView, bufferView.byteStride) :
                this.adapter.vertexBuffer(dataView, bufferView.byteStride)
            this.resources.push(buffer)
            buffers.set(bufferView, buffer);
        }
        return buffers;
    }
    
    private gpuMaterials() {
        const textures = this.gpuTextures();
        const samplers = this.gpuSamplers();
        const whiteBaseColorTexture = this.adapter.texture(this.whiteImage, false);
        const whiteBaseColorSampler = this.adapter.sampler(new graph.Sampler({}, 0));
        const whiteMetallicRoughnessTexture = this.adapter.texture(this.whiteImage, true);
        const whiteMetallicRoughnessSampler = this.adapter.sampler(new graph.Sampler({}, 0));
        const whiteEmissiveTexture = this.adapter.texture(this.whiteImage, false);
        const whiteEmissiveSampler = this.adapter.sampler(new graph.Sampler({}, 0));
        const blueNormalTexture = this.adapter.texture(this.blueImage, true);
        const blueNormalSampler = this.adapter.sampler(new graph.Sampler({}, 0));
        const materials: Material<T, S>[] = this.model.materials.map(m => ({
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
            normalTexture: m.normalTexture !== null ? [
                textures.get(m.normalTexture.texture.source) ?? blueNormalTexture,
                samplers.get(m.normalTexture.texture.sampler) ?? blueNormalSampler,
            ] : [blueNormalTexture, blueNormalSampler],
            alphaCutoff: m.alphaCutoff,
            alphaMode: m.alphaMode,
            doubleSided: m.doubleSided,
        }));
        return materials;
    }

    private gpuTextures() {
        const textures: Map<graph.TextureImage, T> = new Map();
        for (const image of this.model.images) {
            const gpuTexture = this.adapter.texture(image.image, image.linear)
            this.resources.push(gpuTexture)
            textures.set(image, gpuTexture);
        }
        return textures;
    }
    
    private gpuSamplers() {
        const samplers: Map<graph.Sampler, S> = new Map();
        for (const sampler of this.model.samplers) {
            const gpuSampler = this.adapter.sampler(sampler)
            samplers.set(sampler, gpuSampler);
        }
        return samplers;
    }
    
    render(renderer: R) {
        for (const routine of this.nodeLevelRenderingRoutines) {
            routine(renderer)
        }
    }

    private renderNode(renderer: R, node: graph.Node, binder: RenderingRoutine<R>) {
        binder(renderer);
        for (const mesh of node.meshes) {
            this.renderMesh(renderer, mesh);
        }
    }

    private renderMesh(renderer: R, mesh: graph.Mesh) {
        for (const primitive of mesh.primitives) {
            this.renderPrimitive(renderer, primitive)
        }
    }

    private renderPrimitive(renderer: R, primitive: graph.Primitive) {
        const routine = this.primitiveLevelRenderingRoutines[primitive.meshIndex][primitive.index]
        routine(renderer)
    }

}

async function onePixelImage(r: number, g: number, b: number, a: number) {
    const array = new Uint8ClampedArray(4);
    array[0] = u8Shade(r);
    array[1] = u8Shade(g);
    array[2] = u8Shade(b);
    array[3] = u8Shade(a);
    const whiteBaseColorImageData = new ImageData(array, 1, 1);
    const whiteBaseColorImage = await createImageBitmap(whiteBaseColorImageData);
    return whiteBaseColorImage;
}

function u8Shade(s: number): number {
    return Math.min(Math.max(Math.round(s * 0xFF), 0), 0xFF)
}

function collectNodeLevelData(scene: graph.Scene): NodeLevelResources {
    const matrix: Matrix = {
        matrix: aether.mat4.identity(),
        antiMatrix: aether.mat4.identity()
    }
    const resources: NodeLevelResources = {
        matrices: [],
        mappings: [{
            node: scene,
            matrixIndex: null
        }]
    }
    let index: number | null = null
    for (const node of scene.nodes) {
        index = doCollectNodeLevelData(node, matrix, index, resources)
    }
    return resources
}

function doCollectNodeLevelData(node: graph.Node, parentMatrix: Matrix, parentIndex: number | null, resources: NodeLevelResources): number | null {
    const matrix = node.isIdentityMatrix ? parentMatrix : {
        matrix: aether.mat4.mul(parentMatrix.matrix, node.matrix),
        antiMatrix: aether.mat4.mul(parentMatrix.antiMatrix, node.antiMatrix)
    }
    let index = node.isIdentityMatrix ? parentIndex : null
    if (index === null && node.meshes.length > 0) {
        index = resources.matrices.length
        resources.matrices.push(matrix)
    }
    resources.mappings.push({ node, matrixIndex: index })
    for (const child of node.children) {
        index = doCollectNodeLevelData(child, matrix, index, resources)
    }
    return parentIndex === null && node.isIdentityMatrix && index !== null ? index : parentIndex
}

type NodeLevelMapping = {
    node: graph.Node | graph.Scene;
    matrixIndex: number | null;
};

type NodeLevelResources = {
    matrices: Matrix[],
    mappings: NodeLevelMapping[]
}
