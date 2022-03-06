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
export class Model {
    constructor(model, buffers) {
        var _a;
        this.buffers = buffers;
        markIndexBufferView(model);
        this.bufferViews = model.bufferViews.map((bufferView, i) => new BufferView(bufferView, i, buffers));
        this.accessors = model.accessors.map((accessor, i) => new Accessor(accessor, i, this.bufferViews));
        this.meshes = model.meshes.map((mesh, i) => new Mesh(mesh, i, this.accessors));
        this.nodes = model.nodes.map((node, i) => new Node(node, i, this.meshes));
        this.nodes.forEach(node => node.wire(this.nodes));
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
        const min = minVec(ranges.map(([min, max]) => min));
        const max = maxVec(ranges.map(([min, max]) => max));
        [this.min, this.max] = [...min, ...max].some(c => Math.abs(c) == Number.MAX_VALUE) ?
            [[-1, -1, -1], [1, 1, 1]] :
            [min, max];
        const scale = 2 / Math.max(...aether.vec3.sub(this.max, this.min));
        const center = aether.vec3.scale(aether.vec3.add(this.min, this.max), -0.5);
        this.matrix = aether.mat4.mul(aether.mat4.scaling(scale, scale, scale), aether.mat4.translation(center));
    }
}
export class Node extends IdentifiableObject {
    constructor(node, i, meshes) {
        super(`node#${i}`);
        this.meshes = [];
        this.children = [];
        this._range = null;
        if (node.mesh !== undefined) {
            this.meshes.push(meshes[node.mesh]);
        }
        this.matrix = node.matrix !== undefined ?
            aether.mat4.from(node.matrix) :
            aether.mat4.identity();
        this.matrix = node.translation !== undefined ?
            aether.mat4.mul(this.matrix, aether.mat4.translation(node.translation)) :
            this.matrix;
        this.matrix = node.rotation !== undefined ?
            aether.mat4.mul(this.matrix, aether.mat4.cast(aether.quat.toMatrix(node.rotation))) :
            this.matrix;
        this.matrix = node.scale !== undefined ?
            aether.mat4.mul(this.matrix, aether.mat4.scaling(...node.scale)) :
            this.matrix;
        const inverse = aether.mat4.inverse(this.matrix);
        this.antiMatrix = aether.mat4.transpose([inverse[0], inverse[1], inverse[2], [0, 0, 0, 1]]);
        this.isIdentityMatrix = isIdentityMatrix(this.matrix);
        this.gltfNode = node;
    }
    wire(nodes) {
        if (this.children.length > 0) {
            return;
        }
        if (this.gltfNode.children != undefined) {
            for (const child of this.gltfNode.children) {
                this.children.push(nodes[child]);
            }
        }
    }
    get range() {
        if (this._range !== null) {
            return this._range;
        }
        const childRanges = this.children.map(child => child.range);
        const min = minVec([
            ...this.meshes.map(mesh => mesh.min),
            ...childRanges.map(([min, max]) => min)
        ]);
        const max = maxVec([
            ...this.meshes.map(mesh => mesh.max),
            ...childRanges.map(([min, max]) => max)
        ]);
        return this._range = minMax(this.matrix, min, max);
    }
}
export class Mesh extends IdentifiableObject {
    constructor(mesh, i, accessors) {
        super(`mesh#${i}`);
        this.primitives = mesh.primitives.map((primitive, p) => new Primitive(primitive, i, p, accessors));
        this.min = minVec(this.primitives.map(p => p.min));
        this.max = maxVec(this.primitives.map(p => p.max));
    }
}
export class Primitive extends IdentifiableObject {
    constructor(primitive, m, i, accessors) {
        var _a;
        super(`primitive#${m}_${i}`);
        this.mode = (_a = primitive.mode) !== null && _a !== void 0 ? _a : WebGLRenderingContext.TRIANGLES;
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
        this.min = position.min.length >= 3 ? aether.vec3.from(position.min) : maxVecEver();
        this.max = position.max.length >= 3 ? aether.vec3.from(position.max) : minVecEver();
    }
}
export class Accessor extends IdentifiableObject {
    constructor(accessor, i, bufferViews) {
        var _a, _b, _c, _d, _e;
        super(`accessor#${i}`);
        this.bufferView = bufferViews[(_a = accessor.bufferView) !== null && _a !== void 0 ? _a : utils.failure("Using zero buffers not supported yet!")];
        this.byteOffset = (_b = accessor.byteOffset) !== null && _b !== void 0 ? _b : 0;
        this.componentType = accessor.componentType;
        this.normalized = (_c = accessor.normalized) !== null && _c !== void 0 ? _c : false;
        this.count = accessor.count;
        this.type = accessor.type;
        this.min = (_d = accessor.min) !== null && _d !== void 0 ? _d : [];
        this.max = (_e = accessor.max) !== null && _e !== void 0 ? _e : [];
    }
}
export class BufferView extends IdentifiableObject {
    constructor(bufferView, i, buffers) {
        var _a, _b;
        super(`bufferView#${i}`);
        this.buffer = buffers[bufferView.buffer];
        this.byteLength = bufferView.byteLength;
        this.byteOffset = (_a = bufferView.byteOffset) !== null && _a !== void 0 ? _a : 0;
        this.byteStride = (_b = bufferView.byteStride) !== null && _b !== void 0 ? _b : 0;
        this.index = bufferView.target == WebGLRenderingContext.ELEMENT_ARRAY_BUFFER;
    }
}
function maxVec(vectors) {
    return aether.vec3.maxAll(minVecEver(), ...vectors);
}
function minVec(vectors) {
    return aether.vec3.minAll(maxVecEver(), ...vectors);
}
function minVecEver() {
    return [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
}
function maxVecEver() {
    return [+Number.MAX_VALUE, +Number.MAX_VALUE, +Number.MAX_VALUE];
}
function markIndexBufferView(model) {
    var _a;
    for (const mesh of model.meshes) {
        for (const primitive of mesh.primitives) {
            if (primitive.indices !== undefined) {
                const accessor = model.accessors[primitive.indices];
                const bufferView = model.bufferViews[(_a = accessor.bufferView) !== null && _a !== void 0 ? _a : utils.failure("Using zero buffers not supported yet!")];
                bufferView.target = WebGLRenderingContext.ELEMENT_ARRAY_BUFFER;
                if (bufferView.byteStride === undefined && accessor.componentType == WebGLRenderingContext.UNSIGNED_BYTE) {
                    bufferView.byteStride = 1;
                }
            }
        }
    }
}
function isIdentityMatrix(matrix) {
    for (let i = 0; i < 4; i++) {
        for (let j = i; j < 4; j++) {
            if (i === j) {
                if (matrix[i][j] !== 1) {
                    return false;
                }
            }
            else {
                if (matrix[i][j] !== 0 || matrix[j][i] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}
function minMax(matrix, min, max) {
    if ([...min, ...max].some(c => Math.abs(c) == Number.MAX_VALUE)) {
        return [maxVecEver(), minVecEver()];
    }
    const bounds = [min, max];
    const vectors = [];
    for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
            for (let z = 0; z < 2; z++) {
                vectors.push(aether.vec3.from(aether.mat4.apply(matrix, [
                    bounds[x][0],
                    bounds[y][1],
                    bounds[z][2],
                    1
                ])));
            }
        }
    }
    return [minVec(vectors), maxVec(vectors)];
}
//# sourceMappingURL=gltf.graph.js.map