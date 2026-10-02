import * as gltf from './gltf.js';
import * as utils from '../utils.js';
import * as aether from "aether";
import * as aetherX from '../../utils/aether.js';
export class Model {
    constructor(model, buffers, images, legacyPerspective) {
        this.buffers = buffers;
        gltf.enrichBufferViews(model);
        this.bufferViews = model.bufferViews.map((bufferView, i) => new BufferView(bufferView, i, buffers, model.accessors));
        this.accessors = model.accessors.map((accessor, i) => new Accessor(accessor, i, this.bufferViews));
        this.images = images.map(i => ({ image: i, linear: false }));
        this.samplers = [...(model.samplers ?? []), {}].map((s, i) => new Sampler(s, i));
        this.textures = (model.textures ?? []).map((t, i) => new Texture(t, i, this.samplers, this.images));
        const materials = model.materials === undefined || model.materials.length === 0 ? [{}] : model.materials;
        this.materials = materials.map((material, i) => new Material(material, i, this.textures));
        for (const m of this.materials) {
            if (m.metallicRoughnessTexture !== null) {
                m.metallicRoughnessTexture.texture.source.linear = true;
            }
            if (m.occlusionTexture !== null) {
                m.occlusionTexture.texture.source.linear = true;
            }
            if (m.normalTexture !== null) {
                m.normalTexture.texture.source.linear = true;
            }
        }
        this.meshes = model.meshes.map((mesh, i) => new Mesh(mesh, i, this.accessors, this.materials));
        this.cameras = (model.cameras ?? []).map(camera => Camera.create(camera, legacyPerspective));
        const nodes = model.nodes.map((node, i) => utils.lazily(() => new Node(node, i, this.meshes, this.cameras, nodes)));
        this.nodes = nodes.map(node => node());
        this.scenes = model.scenes.map((scene, i) => new Scene(scene, i, this.nodes, legacyPerspective));
        this.scene = this.scenes[model.scene ?? 0];
    }
    static async create(modelUri, legacyPerspective = false) {
        const { model, buffers, images } = await gltf.fetchModel(modelUri);
        return new Model(model, buffers, images, legacyPerspective);
    }
}
class IdentifiableObject {
    constructor(key) {
        this.key = key;
    }
}
export class Scene extends IdentifiableObject {
    constructor(scene, i, nodes, legacyPerspective) {
        super(`scene#${i}`);
        this.nodes = [];
        for (const node of scene.nodes) {
            this.nodes.push(nodes[node]);
        }
        const ranges = this.nodes.map(node => node.range);
        const range = aetherX.union(ranges);
        this.range = aetherX.isOpen(range) ? [[-1, -1, -1], [1, 1, 1]] : range;
        this.matrix = aetherX.centeringMatrix(this.range);
        this.perspectives = collectScenePerspectives(this);
        this.perspectives.push(defaultPerspective(legacyPerspective, this.matrix));
    }
}
export class Node extends IdentifiableObject {
    constructor(node, i, meshes, cameras, nodes) {
        super(`node#${i}`);
        this.matrix = gltf.matrixOf(node);
        this.antiMatrix = comatrix(this.matrix);
        this.isIdentityMatrix = aether.isIdentity(this.matrix);
        this.cameras = node.camera !== undefined ? [cameras[node.camera]] : [];
        this.meshes = node.mesh !== undefined ? [meshes[node.mesh]] : [];
        this.children = node.children !== undefined ? node.children.map(child => nodes[child]()) : [];
        this.range = aetherX.applyMatrixToRange(this.matrix, aetherX.union([
            aetherX.union(this.meshes.map(mesh => mesh.range)),
            aetherX.union(this.children.map(child => child.range))
        ]));
    }
}
export class Texture extends IdentifiableObject {
    constructor(texture, i, samplers, images) {
        super(`texture#${i}`);
        this.sampler = samplers[texture.sampler ?? samplers.length - 1];
        this.source = images[texture.source];
    }
}
export class Sampler extends IdentifiableObject {
    constructor(sampler, i) {
        super(`sampler#${i}`);
        this.magFilter = sampler.magFilter ?? WebGL2RenderingContext.LINEAR;
        this.minFilter = sampler.minFilter ?? WebGL2RenderingContext.LINEAR;
        this.wrapS = sampler.wrapS ?? WebGL2RenderingContext.REPEAT;
        this.wrapT = sampler.wrapT ?? WebGL2RenderingContext.REPEAT;
    }
}
export class Perspective {
    constructor(camera, matrix, modelMatrix = aether.mat4.identity()) {
        this.camera = camera;
        this.matrix = matrix;
        this.modelMatrix = modelMatrix;
        this.antiMatrix = comatrix(matrix);
    }
}
export class Camera {
    constructor(zNear, zFar) {
        this.zNear = zNear;
        this.zFar = zFar;
    }
    static create(camera, legacy) {
        return camera.type == "perspective"
            ? new PerspectiveCamera(camera.perspective, legacy)
            : new OrthographicCamera(camera.orthographic, legacy);
    }
}
export class PerspectiveCamera extends Camera {
    constructor(camera, legacy = false) {
        super(camera.znear, camera.zfar ?? null);
        this.projection = new aether.PerspectiveProjection(this.zNear, this.zFar, true, legacy);
        this.focalLength = 1.0 / Math.tan(0.5 * camera.yfov);
        this.aspectRatio = camera.aspectRatio ?? 1.0;
    }
    matrix(aspectRatio = this.aspectRatio, mag = this.focalLength) {
        return this.projection.matrix(mag, aspectRatio);
    }
    inverseMatrix(aspectRatio = this.aspectRatio, mag = this.focalLength) {
        return this.projection.inverseMatrix(mag, aspectRatio);
    }
}
/* TODO: Fix this! */
export class OrthographicCamera extends Camera {
    constructor(camera, legacy = false) {
        super(camera.znear, camera.zfar);
        this.camera = new PerspectiveCamera({
            yfov: Math.atan2(1, Math.sqrt(camera.xmag * camera.ymag)),
            znear: camera.znear,
            zfar: camera.zfar,
            aspectRatio: camera.ymag / camera.xmag
        }, legacy);
    }
    matrix(aspectRatio = this.camera.aspectRatio, mag = this.camera.focalLength) {
        return this.camera.matrix(aspectRatio, mag);
    }
    inverseMatrix(aspectRatio = this.camera.aspectRatio, mag = this.camera.focalLength) {
        return this.camera.inverseMatrix(aspectRatio, mag);
    }
}
export class Mesh extends IdentifiableObject {
    constructor(mesh, i, accessors, materials) {
        super(`mesh#${i}`);
        this.primitives = mesh.primitives.map((primitive, p) => new Primitive(primitive, i, p, accessors, materials));
        this.range = aetherX.union(this.primitives.map(p => p.range));
    }
}
export class Primitive extends IdentifiableObject {
    constructor(primitive, meshIndex, index, accessors, materials) {
        super(`primitive#${meshIndex}_${index}`);
        this.meshIndex = meshIndex;
        this.index = index;
        this.mode = primitive.mode ?? WebGL2RenderingContext.TRIANGLES;
        this.indices = primitive.indices !== undefined ? accessors[primitive.indices] : null;
        this.count = this.indices !== null ? this.indices.count : Number.MAX_SAFE_INTEGER;
        this.attributes = {};
        for (const key of Object.keys(primitive.attributes)) {
            const accessor = accessors[primitive.attributes[key]];
            this.attributes[key] = accessor;
            if (this.indices === null && accessor.count < this.count) {
                this.count = accessor.count;
            }
        }
        const position = this.attributes["POSITION"];
        this.material = materials[primitive.material !== undefined ? primitive.material : 0];
        this.range = position.range;
    }
}
export class Accessor extends IdentifiableObject {
    constructor(accessor, i, bufferViews) {
        super(`accessor#${i}`);
        this.bufferView = bufferViews[accessor.bufferView ?? utils.failure("Using zero buffers not supported yet!")];
        this.byteOffset = accessor.byteOffset ?? 0;
        this.componentType = accessor.componentType;
        this.normalized = accessor.normalized ?? false;
        this.count = accessor.count;
        this.type = accessor.type;
        this.range = [
            accessor.min !== undefined ? aether.vec3.from(accessor.min) : aetherX.maxVecEver(),
            accessor.max !== undefined ? aether.vec3.from(accessor.max) : aetherX.minVecEver()
        ];
    }
}
export class BufferView extends IdentifiableObject {
    constructor(bufferView, i, buffers, accessors) {
        super(`bufferView#${i}`);
        const references = accessors.filter(accessor => accessor.bufferView === i);
        const offsets = references.map(r => r.byteOffset ?? 0);
        this.index = bufferView.target == WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER;
        this.interleaved = offsets.length === 0 || !this.index && offsets.every(o => o === offsets[0]);
        this.buffer = buffers[bufferView.buffer];
        this.byteLength = bufferView.byteLength;
        this.byteOffset = bufferView.byteOffset ?? 0;
        this.byteStride = bufferView.byteStride ?? (this.interleaved ?
            references
                .map(accessor => sizeOf(accessor))
                .reduce((s1, s2) => s1 + s2, 0) :
            sizeOf(references[0]));
    }
}
export class Material extends IdentifiableObject {
    constructor(material, index, textures) {
        super(`material${index}`);
        this.index = index;
        const pbr = material.pbrMetallicRoughness ?? {};
        this.baseColorFactor = pbr.baseColorFactor ?? aether.vec4.of(1, 1, 1, 1);
        this.baseColorTexture = pbr.baseColorTexture !== undefined ? new TextureInfo(pbr.baseColorTexture.texCoord ?? 0, textures[pbr.baseColorTexture.index]) : null;
        this.metallicFactor = pbr.metallicFactor ?? 1.0;
        this.roughnessFactor = pbr.roughnessFactor ?? 1.0;
        this.metallicRoughnessTexture = pbr.metallicRoughnessTexture !== undefined ? new TextureInfo(pbr.metallicRoughnessTexture.texCoord ?? 0, textures[pbr.metallicRoughnessTexture.index]) : null;
        this.emissiveFactor = material.emissiveFactor ?? aether.vec3.of(0, 0, 0);
        this.emissiveTexture = material.emissiveTexture !== undefined ? new TextureInfo(material.emissiveTexture.texCoord ?? 0, textures[material.emissiveTexture.index]) : null;
        this.occlusionTexture = material.occlusionTexture !== undefined ? new TextureInfo(material.occlusionTexture.texCoord ?? 0, textures[material.occlusionTexture.index]) : null;
        this.normalTexture = material.normalTexture !== undefined ? new TextureInfo(material.normalTexture.texCoord ?? 0, textures[material.normalTexture.index]) : null;
        this.alphaMode = material.alphaMode ?? "OPAQUE";
        this.alphaCutoff = material.alphaCutoff ?? 0.5;
        this.doubleSided = material.doubleSided ?? false;
    }
}
export class TextureInfo {
    constructor(texCoord, texture) {
        this.texCoord = texCoord;
        this.texture = texture;
    }
}
function comatrix(matrix) {
    const m = [...matrix];
    m[3] = [0, 0, 0, 1];
    return aether.mat4.comatrix(m);
}
export function defaultPerspective(legacyPerspective = false, matrix = aether.mat4.identity()) {
    return new Perspective(defaultCamera(legacyPerspective), defaultViewMatrix(), matrix);
}
export function defaultCamera(legacyPerspective = false) {
    return new PerspectiveCamera({
        yfov: 2 * Math.atan(0.5),
        znear: 1
    }, legacyPerspective);
}
export function defaultViewMatrix() {
    return aether.mat4.lookAt([2, 2, 2]);
}
function sizeOf(accessor) {
    return elementSize(accessor.type) * componentSize(accessor.componentType);
}
function elementSize(type) {
    switch (type) {
        case "SCALAR": return 1;
        case "VEC2": return 2;
        case "VEC3": return 3;
        case "VEC4": return 4;
        case "MAT2": return 4;
        case "MAT3": return 9;
        case "MAT4": return 16;
        default: return utils.failure(`Unrecognized element type: ${type}`);
    }
}
function componentSize(componentType) {
    switch (componentType) {
        case WebGL2RenderingContext.BYTE:
        case WebGL2RenderingContext.UNSIGNED_BYTE: return 1;
        case WebGL2RenderingContext.SHORT:
        case WebGL2RenderingContext.UNSIGNED_SHORT: return 2;
        case WebGL2RenderingContext.INT:
        case WebGL2RenderingContext.UNSIGNED_INT:
        case WebGL2RenderingContext.FLOAT: return 4;
        default: return utils.failure(`Unrecognized scalar type: ${componentType}`);
    }
}
function collectScenePerspectives(scene) {
    const perspectives = [];
    for (const node of scene.nodes) {
        collectNodePerspectives(node, aether.mat4.identity(), perspectives);
    }
    return perspectives;
}
function collectNodePerspectives(node, parentMatrix, perspectives) {
    const matrix = node.isIdentityMatrix ? parentMatrix : aether.mat4.mul(parentMatrix, node.matrix);
    if (node.cameras[0]) {
        const m = aether.mat4.orthogonal(aether.mat4.inverse(matrix), true);
        perspectives.push(new Perspective(node.cameras[0], m));
    }
    for (const child of node.children) {
        collectNodePerspectives(child, matrix, perspectives);
    }
}
//# sourceMappingURL=gltf.graph.js.map