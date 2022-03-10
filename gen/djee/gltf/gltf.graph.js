var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gltf from './gltf.js';
import * as utils from '../utils.js';
import * as aether from '/aether/latest/index.js';
import * as aetherX from '../../utils/aether.js';
export class Model {
    constructor(model, buffers) {
        var _a;
        this.buffers = buffers;
        gltf.enrichBufferViews(model);
        this.bufferViews = model.bufferViews.map((bufferView, i) => new BufferView(bufferView, i, buffers, model.accessors));
        this.accessors = model.accessors.map((accessor, i) => new Accessor(accessor, i, this.bufferViews));
        this.meshes = model.meshes.map((mesh, i) => new Mesh(mesh, i, this.accessors));
        const nodes = model.nodes.map((node, i) => utils.lazily(() => new Node(node, i, this.meshes, nodes)));
        this.nodes = nodes.map(node => node());
        this.scenes = model.scenes.map((scene, i) => new Scene(scene, i, this.nodes));
        this.scene = this.scenes[(_a = model.scene) !== null && _a !== void 0 ? _a : 0];
    }
    static create(modelUri) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(modelUri, { mode: "cors" });
            const model = yield response.json();
            const buffers = yield gltf.fetchBuffers(model.buffers, modelUri);
            return new Model(model, buffers);
        });
    }
}
class IdentifiableObject {
    constructor(key) {
        this.key = key;
    }
}
export class Scene extends IdentifiableObject {
    constructor(scene, i, nodes) {
        super(`scene#${i}`);
        this.nodes = [];
        for (const node of scene.nodes) {
            this.nodes.push(nodes[node]);
        }
        const ranges = this.nodes.map(node => node.range);
        const range = aetherX.union(ranges);
        this.range = aetherX.isOpen(range) ? [[-1, -1, -1], [1, 1, 1]] : range;
        this.matrix = aetherX.centeringMatrix(this.range);
    }
}
export class Node extends IdentifiableObject {
    constructor(node, i, meshes, nodes) {
        super(`node#${i}`);
        this.matrix = gltf.matrixOf(node);
        this.antiMatrix = aetherX.anti(this.matrix);
        this.isIdentityMatrix = aetherX.isIdentityMatrix(this.matrix);
        this.meshes = node.mesh !== undefined ? [meshes[node.mesh]] : [];
        this.children = node.children !== undefined ? node.children.map(child => nodes[child]()) : [];
        this.range = aetherX.applyMatrixToRange(this.matrix, aetherX.union([
            aetherX.union(this.meshes.map(mesh => mesh.range)),
            aetherX.union(this.children.map(child => child.range))
        ]));
    }
}
export class Mesh extends IdentifiableObject {
    constructor(mesh, i, accessors) {
        super(`mesh#${i}`);
        this.primitives = mesh.primitives.map((primitive, p) => new Primitive(primitive, i, p, accessors));
        this.range = aetherX.union(this.primitives.map(p => p.range));
    }
}
export class Primitive extends IdentifiableObject {
    constructor(primitive, m, i, accessors) {
        var _a;
        super(`primitive#${m}_${i}`);
        this.mode = (_a = primitive.mode) !== null && _a !== void 0 ? _a : WebGL2RenderingContext.TRIANGLES;
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
        this.range = position.range;
    }
}
export class Accessor extends IdentifiableObject {
    constructor(accessor, i, bufferViews) {
        var _a, _b, _c;
        super(`accessor#${i}`);
        this.bufferView = bufferViews[(_a = accessor.bufferView) !== null && _a !== void 0 ? _a : utils.failure("Using zero buffers not supported yet!")];
        this.byteOffset = (_b = accessor.byteOffset) !== null && _b !== void 0 ? _b : 0;
        this.componentType = accessor.componentType;
        this.normalized = (_c = accessor.normalized) !== null && _c !== void 0 ? _c : false;
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
        var _a, _b;
        super(`bufferView#${i}`);
        const references = accessors.filter(accessor => accessor.bufferView === i);
        const offsets = references.map(r => { var _a; return (_a = r.byteOffset) !== null && _a !== void 0 ? _a : 0; });
        this.index = bufferView.target == WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER;
        this.interleaved = offsets.length === 0 || !this.index && offsets.every(o => o === offsets[0]);
        this.buffer = buffers[bufferView.buffer];
        this.byteLength = bufferView.byteLength;
        this.byteOffset = (_a = bufferView.byteOffset) !== null && _a !== void 0 ? _a : 0;
        this.byteStride = (_b = bufferView.byteStride) !== null && _b !== void 0 ? _b : (this.interleaved ?
            references
                .map(accessor => sizeOf(accessor))
                .reduce((s1, s2) => s1 + s2, 0) :
            sizeOf(references[0]));
    }
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
//# sourceMappingURL=gltf.graph.js.map