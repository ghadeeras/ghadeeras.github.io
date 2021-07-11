var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BufferTarget } from "./buffer.js";
import { asVariableInfo } from "./reflection.js";
import { failure, lazily } from "./utils.js";
export class Matrix extends Float64Array {
    constructor() {
        super(16);
    }
    prod(matrix) {
        const result = new Matrix();
        for (let i = 0; i < 16; i++) {
            let left = i & 3;
            let right = i - left;
            let dot = 0;
            while (left < 16) {
                dot += this[left] * matrix[right++];
                left += 4;
            }
            result[i] = dot;
        }
        return result;
    }
    static create(components) {
        const matrix = new Matrix();
        matrix.set(components);
        return matrix;
    }
    static rotate(q) {
        const xx = q[0] * q[0];
        const yy = q[1] * q[1];
        const zz = q[2] * q[2];
        const xy = q[0] * q[1];
        const yz = q[1] * q[2];
        const zx = q[2] * q[0];
        const wx = q[3] * q[0];
        const wy = q[3] * q[1];
        const wz = q[3] * q[2];
        return Matrix.create([
            1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (zx + wy), 0,
            2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx), 0,
            2 * (zx - wy), 2 * (yz + wx), 1 - 2 * (xx + yy), 0,
            0, 0, 0, 1
        ]);
    }
    static scale(s) {
        return Matrix.create([
            s[0], 0, 0, 0,
            0, s[1], 0, 0,
            0, 0, s[2], 0,
            0, 0, 0, 1,
        ]);
    }
    static translate(t) {
        return Matrix.create([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            t[0], t[1], t[2], 1
        ]);
    }
}
Matrix.identity = Matrix.create([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
]);
function fetchBuffer(bufferRef, baseUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = new URL(bufferRef.uri, baseUri);
        const response = yield fetch(url.href);
        const arrayBuffer = yield response.arrayBuffer();
        return arrayBuffer.byteLength == bufferRef.byteLength ?
            arrayBuffer :
            failure(`Buffer at '${bufferRef.uri}' does not have expected length of ${bufferRef.byteLength} bytes!`);
    });
}
class ActiveBufferView {
    constructor(bufferView, buffers, indices, context) {
        var _a, _b;
        this.buffer = indices ?
            context.newIndicesBuffer() :
            context.newBuffer((_a = bufferView.byteStride) !== null && _a !== void 0 ? _a : 0);
        this.buffer.data = new Uint8Array(buffers[bufferView.buffer], (_b = bufferView.byteOffset) !== null && _b !== void 0 ? _b : 0, bufferView.byteLength);
    }
    delete() {
        this.buffer.delete();
    }
}
class ActiveAccessor {
    constructor(accessor, bufferViews) {
        var _a, _b;
        this.accessor = accessor;
        if (accessor.bufferView !== undefined) {
            const buffer = bufferViews[accessor.bufferView].buffer;
            const variableInfo = toVariableInfo(accessor);
            const byteOffset = (_a = accessor.byteOffset) !== null && _a !== void 0 ? _a : 0;
            const normalized = (_b = accessor.normalized) !== null && _b !== void 0 ? _b : false;
            this.bindTo = attribute => attribute.pointTo(buffer, byteOffset, normalized, variableInfo);
            this.bindToIndex = () => BufferTarget.elementArrayBuffer.bind(buffer);
        }
        else {
            this.bindTo = attribute => attribute.setTo(0);
            this.bindToIndex = () => failure("Should never reach this!");
        }
    }
}
export class ActiveModel {
    constructor(model, buffers, matrixUniform, attributesMap, context) {
        var _a;
        const indices = new Set();
        model.meshes
            .forEach(mesh => mesh.primitives
            .filter(p => p.indices !== undefined)
            .map(p => { var _a; return model.accessors[(_a = p.indices) !== null && _a !== void 0 ? _a : -1]; })
            .forEach(accessor => { var _a; return indices.add((_a = accessor.bufferView) !== null && _a !== void 0 ? _a : -1); }));
        this.bufferViews = model.bufferViews.map((bufferView, i) => new ActiveBufferView(bufferView, buffers, indices.has(i), context));
        const accessors = model.accessors.map(accessor => new ActiveAccessor(accessor, this.bufferViews));
        const meshes = model.meshes.map(mesh => new ActiveMesh(mesh, accessors, attributesMap, context));
        const nodes = [];
        model.nodes.forEach(node => new ActiveNode(node, meshes, nodes, matrixUniform));
        this.scenes = model.scenes.map(scene => new ActiveScene(scene, nodes));
        this.defaultScene = this.scenes[(_a = model.scene) !== null && _a !== void 0 ? _a : 0];
    }
    static create(modelUri, matrixUniform, attributesMap, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(modelUri, { mode: "cors" });
            const model = yield response.json();
            const buffers = new Array(model.buffers.length);
            for (let i = 0; i < buffers.length; i++) {
                buffers[i] = yield fetchBuffer(model.buffers[i], modelUri);
            }
            return new ActiveModel(model, buffers, matrixUniform, attributesMap, context);
        });
    }
    render(matrix) {
        this.defaultScene.render(matrix);
    }
    delete() {
        this.bufferViews.forEach(bufferView => bufferView.delete());
    }
}
export class ActiveScene {
    constructor(scene, nodes) {
        this.nodes = scene.nodes.map(child => nodes[child]);
    }
    render(matView) {
        for (let node of this.nodes) {
            node.render(matView);
        }
    }
}
class ActiveNode {
    constructor(node, meshes, nodes, matrixUniform) {
        this.matrixUniform = matrixUniform;
        this.children = lazily(() => {
            const children = node.children !== undefined ? node.children.map(child => nodes[child]) : [];
            if (node.mesh !== undefined) {
                children.push(meshes[node.mesh]);
            }
            return children;
        });
        this.matrix = node.matrix !== undefined ?
            Matrix.create(node.matrix) :
            Matrix.identity;
        this.matrix = node.translation !== undefined ?
            this.matrix.prod(Matrix.translate(node.translation)) :
            this.matrix;
        this.matrix = node.rotation !== undefined ?
            this.matrix.prod(Matrix.rotate(node.rotation)) :
            this.matrix;
        this.matrix = node.scale !== undefined ?
            this.matrix.prod(Matrix.scale(node.scale)) :
            this.matrix;
        nodes.push(this);
    }
    render(parentMatrix) {
        const matrix = parentMatrix.prod(this.matrix);
        this.matrixUniform.data = matrix;
        for (let child of this.children()) {
            child.render(matrix);
        }
        this.matrixUniform.data = parentMatrix;
    }
}
class ActiveMesh {
    constructor(mesh, accessors, attributeMap, context) {
        this.primitives = mesh.primitives.map(primitive => new ActiveMeshPrimitive(primitive, accessors, attributeMap, context));
    }
    render() {
        for (const primitive of this.primitives) {
            primitive.render();
        }
    }
}
class ActiveMeshPrimitive {
    constructor(meshPrimitive, accessors, attributeMap, context) {
        this.sideEffects = [];
        const indicesAccessor = meshPrimitive.indices !== undefined ? accessors[meshPrimitive.indices] : null;
        let count = indicesAccessor ? indicesAccessor.accessor.count : Number.MAX_SAFE_INTEGER;
        for (let attributeName in meshPrimitive.attributes) {
            const attribute = attributeMap[attributeName];
            const accessorIndex = meshPrimitive.attributes[attributeName];
            const accessor = accessors[accessorIndex];
            if (attribute) {
                this.sideEffects.push(() => accessor.bindTo(attribute));
            }
            if (!indicesAccessor && accessor.accessor.count < count) {
                count = accessor.accessor.count;
            }
        }
        count %= Number.MAX_SAFE_INTEGER;
        if (indicesAccessor) {
            this.sideEffects.push(indicesAccessor.bindToIndex);
        }
        if ((indicesAccessor === null || indicesAccessor === void 0 ? void 0 : indicesAccessor.accessor.componentType) === WebGLRenderingContext.UNSIGNED_INT) {
            const ext = context.gl.getExtension('OES_element_index_uint');
            if (!ext) {
                failure("OES_element_index_uint extension is not supported");
            }
        }
        const mode = meshPrimitive.mode !== undefined ? meshPrimitive.mode : WebGLRenderingContext.TRIANGLES;
        this.sideEffects.push(indicesAccessor ?
            () => { var _a; return context.gl.drawElements(mode, count, indicesAccessor.accessor.componentType, (_a = indicesAccessor.accessor.byteOffset) !== null && _a !== void 0 ? _a : 0); } :
            () => context.gl.drawArrays(mode, 0, count));
    }
    render() {
        for (let sideEffect of this.sideEffects) {
            sideEffect();
        }
    }
}
function toVariableInfo(accessor) {
    const result = asVariableInfo({
        name: "attribute",
        size: 1,
        type: glTypeOf(accessor)
    }, accessor.componentType);
    return result;
}
function glTypeOf(accessor) {
    switch (accessor.type) {
        case "SCALAR": return accessor.componentType;
        case "VEC2": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC2 : WebGLRenderingContext.INT_VEC2;
        case "VEC3": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC3 : WebGLRenderingContext.INT_VEC3;
        case "VEC4": return accessor.componentType == WebGLRenderingContext.FLOAT ? WebGLRenderingContext.FLOAT_VEC4 : WebGLRenderingContext.INT_VEC4;
        case "MAT2": return WebGLRenderingContext.FLOAT_MAT2;
        case "MAT3": return WebGLRenderingContext.FLOAT_MAT3;
        case "MAT4": return WebGLRenderingContext.FLOAT_MAT4;
    }
}
//# sourceMappingURL=gltf.js.map