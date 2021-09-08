var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { mat4, quat } from "../../ether/latest/index.js";
import { asVariableInfo } from "./reflection.js";
import { failure, lazily } from "./utils.js";
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
            context.newAttributesBuffer((_a = bufferView.byteStride) !== null && _a !== void 0 ? _a : 0);
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
            this.bindToIndex = () => buffer.bind();
        }
        else {
            this.bindTo = attribute => attribute.setTo(0);
            this.bindToIndex = () => failure("Should never reach this!");
        }
    }
}
export class ActiveModel {
    constructor(model, buffers, positionsMatUniform, normalsMatUniform, attributesMap, context) {
        var _a;
        const indices = new Set();
        model.meshes
            .forEach(mesh => mesh.primitives
            .filter(p => p.indices !== undefined)
            .map(p => { var _a; return model.accessors[(_a = p.indices) !== null && _a !== void 0 ? _a : -1]; })
            .forEach(accessor => { var _a; return indices.add((_a = accessor.bufferView) !== null && _a !== void 0 ? _a : -1); }));
        this.bufferViews = model.bufferViews.map((bufferView, i) => new ActiveBufferView(bufferView, buffers, indices.has(i), context));
        const accessors = model.accessors.map(accessor => new ActiveAccessor(accessor, this.bufferViews));
        const meshes = model.meshes.map(mesh => new ActiveMesh(mesh, accessors, attributesMap, context, positionsMatUniform, normalsMatUniform));
        const nodes = [];
        model.nodes.forEach(node => new ActiveNode(node, meshes, nodes));
        this.scenes = model.scenes.map(scene => new ActiveScene(scene, nodes));
        this.defaultScene = this.scenes[(_a = model.scene) !== null && _a !== void 0 ? _a : 0];
    }
    static create(modelUri, positionsMatUniform, normalsMatUniform, attributesMap, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(modelUri, { mode: "cors" });
            const model = yield response.json();
            const buffers = new Array(model.buffers.length);
            for (let i = 0; i < buffers.length; i++) {
                buffers[i] = yield fetchBuffer(model.buffers[i], modelUri);
            }
            return new ActiveModel(model, buffers, positionsMatUniform, normalsMatUniform, attributesMap, context);
        });
    }
    render(positionsMatrix, normalsMatrix = positionsMatrix) {
        this.defaultScene.render(positionsMatrix, normalsMatrix);
    }
    delete() {
        this.bufferViews.forEach(bufferView => bufferView.delete());
    }
}
export class ActiveScene {
    constructor(scene, nodes) {
        this.nodes = scene.nodes.map(child => nodes[child]);
    }
    render(positionsMatrix, normalsMatrix = positionsMatrix) {
        for (let node of this.nodes) {
            node.render(positionsMatrix, normalsMatrix);
        }
    }
}
class ActiveNode {
    constructor(node, meshes, nodes) {
        this.children = lazily(() => {
            const children = node.children !== undefined ? node.children.map(child => nodes[child]) : [];
            if (node.mesh !== undefined) {
                children.push(meshes[node.mesh]);
            }
            return children;
        });
        this.positionsMatrix = node.matrix !== undefined ?
            asMat(node.matrix) :
            mat4.identity();
        this.positionsMatrix = node.translation !== undefined ?
            mat4.mul(this.positionsMatrix, mat4.translation(node.translation)) :
            this.positionsMatrix;
        this.positionsMatrix = node.rotation !== undefined ?
            mat4.mul(this.positionsMatrix, mat4.cast(quat.toMatrix(node.rotation))) :
            this.positionsMatrix;
        this.positionsMatrix = node.scale !== undefined ?
            mat4.mul(this.positionsMatrix, mat4.scaling(...node.scale)) :
            this.positionsMatrix;
        this.normalsMatrix = this.positionsMatrix; // mat4.transpose(mat4.inverse(this.matrix)) 
        nodes.push(this);
    }
    render(parentPositionsMatrix, parentNormalsMatrix = parentPositionsMatrix) {
        const positionsMatrix = mat4.mul(parentPositionsMatrix, this.positionsMatrix);
        const normalsMatrix = mat4.mul(parentNormalsMatrix, this.normalsMatrix);
        for (let child of this.children()) {
            child.render(positionsMatrix, normalsMatrix);
        }
    }
}
class ActiveMesh {
    constructor(mesh, accessors, attributeMap, context, positionsMatUniform, normalsMatUniform) {
        this.positionsMatUniform = positionsMatUniform;
        this.normalsMatUniform = normalsMatUniform;
        this.primitives = mesh.primitives.map(primitive => new ActiveMeshPrimitive(primitive, accessors, attributeMap, context));
    }
    render(parentPositionsMatrix, parentNormalsMatrix = parentPositionsMatrix) {
        this.positionsMatUniform.data = mat4.columnMajorArray(parentPositionsMatrix);
        if (this.normalsMatUniform !== null) {
            this.normalsMatUniform.data = mat4.columnMajorArray(parentNormalsMatrix);
        }
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
function asVec(array, offset = 0) {
    return [...array.slice(offset, offset + 4)];
}
function asMat(array, offset = 0) {
    return [
        asVec(array, offset + 0),
        asVec(array, offset + 4),
        asVec(array, offset + 8),
        asVec(array, offset + 12)
    ];
}
//# sourceMappingURL=gltf.js.map