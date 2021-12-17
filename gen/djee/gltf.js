var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { mat4, quat, vec3, vec4 } from "../../ether/latest/index.js";
import { AttributesBuffer } from "./buffer.js";
import { asVariableInfo } from "./reflection.js";
import { failure, lazily } from "./utils.js";
export class GLRenderer {
    constructor(context, attributes, positionsMatUniform, normalsMatUniform) {
        this.context = context;
        this.attributes = attributes;
        this.positionsMatUniform = positionsMatUniform;
        this.normalsMatUniform = normalsMatUniform;
    }
    newIndicesBuffer(byteOffset, byteLength, data) {
        const buffer = this.context.newIndicesBuffer();
        buffer.data = new Uint8Array(data, byteOffset, byteLength);
        return buffer;
    }
    newAttributesBuffer(byteStride, byteOffset, byteLength, data) {
        const buffer = this.context.newAttributesBuffer(byteStride);
        buffer.data = new Uint8Array(data, byteOffset, byteLength);
        return buffer;
    }
    deleteBuffer(buffer) {
        buffer.delete();
    }
    bind(attributeName, buffer, byteOffset, normalized, variableInfo) {
        const attribute = this.attributes[attributeName];
        if (attribute) {
            attribute.pointTo(buffer, byteOffset, normalized, variableInfo);
        }
    }
    bindIndices(buffer) {
        buffer.bind();
    }
    setToZero(attributeName) {
        const attribute = this.attributes[attributeName];
        if (attribute instanceof AttributesBuffer) {
            attribute.setTo(0);
        }
    }
    setIndexComponentType(componentType) {
        if (componentType === WebGLRenderingContext.UNSIGNED_INT) {
            const ext = this.context.gl.getExtension('OES_element_index_uint');
            if (!ext) {
                failure("OES_element_index_uint extension is not supported");
            }
        }
    }
    draw(componentType, mode, count, byteOffset) {
        this.context.gl.drawElements(mode, count, componentType, byteOffset);
    }
    drawIndexed(mode, count, byteOffset) {
        this.context.gl.drawArrays(mode, byteOffset, count);
    }
    get positionsMat() {
        return asMat(this.positionsMatUniform.data);
    }
    set positionsMat(mat) {
        this.positionsMatUniform.data = mat4.columnMajorArray(mat);
    }
    get normalsMat() {
        return asMat(this.normalsMatUniform.data);
    }
    set normalsMat(mat) {
        this.normalsMatUniform.data = mat4.columnMajorArray(mat);
    }
}
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
    constructor(bufferView, buffers, indices, renderer) {
        var _a, _b, _c;
        this.renderer = renderer;
        this.buffer = indices ?
            renderer.newIndicesBuffer((_a = bufferView.byteOffset) !== null && _a !== void 0 ? _a : 0, bufferView.byteLength, buffers[bufferView.buffer]) :
            renderer.newAttributesBuffer((_b = bufferView.byteStride) !== null && _b !== void 0 ? _b : 0, (_c = bufferView.byteOffset) !== null && _c !== void 0 ? _c : 0, bufferView.byteLength, buffers[bufferView.buffer]);
    }
    delete() {
        this.renderer.deleteBuffer(this.buffer);
    }
}
class ActiveAccessor {
    constructor(renderer, accessor, bufferViews) {
        var _a, _b;
        this.accessor = accessor;
        if (accessor.bufferView !== undefined) {
            const buffer = bufferViews[accessor.bufferView].buffer;
            const variableInfo = toVariableInfo(accessor);
            const byteOffset = (_a = accessor.byteOffset) !== null && _a !== void 0 ? _a : 0;
            const normalized = (_b = accessor.normalized) !== null && _b !== void 0 ? _b : false;
            this.bindTo = attribute => renderer.bind(attribute, buffer, byteOffset, normalized, variableInfo);
            this.bindToIndex = () => renderer.bindIndices(buffer);
        }
        else {
            this.bindTo = attribute => renderer.setToZero(attribute);
            this.bindToIndex = () => failure("Should never reach this!");
        }
    }
}
export class ActiveModel {
    constructor(model, buffers, renderer) {
        var _a;
        const indices = new Set();
        model.meshes
            .forEach(mesh => mesh.primitives
            .filter(p => p.indices !== undefined)
            .map(p => { var _a; return model.accessors[(_a = p.indices) !== null && _a !== void 0 ? _a : -1]; })
            .forEach(accessor => { var _a; return indices.add((_a = accessor.bufferView) !== null && _a !== void 0 ? _a : -1); }));
        this.bufferViews = model.bufferViews.map((bufferView, i) => new ActiveBufferView(bufferView, buffers, indices.has(i), renderer));
        const accessors = model.accessors.map(accessor => new ActiveAccessor(renderer, accessor, this.bufferViews));
        const meshes = model.meshes.map(mesh => new ActiveMesh(mesh, accessors, renderer));
        const nodes = [];
        model.nodes.forEach(node => new ActiveNode(node, meshes, nodes));
        this.hasMesh = nodes.some(node => node.hasMesh);
        this.scenes = model.scenes.map(scene => new ActiveScene(scene, nodes));
        this.defaultScene = this.scenes[(_a = model.scene) !== null && _a !== void 0 ? _a : 0];
        this.min = this.defaultScene.min;
        this.max = this.defaultScene.max;
    }
    static create(modelUri, renderer) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(modelUri, { mode: "cors" });
            const model = yield response.json();
            const buffers = new Array(model.buffers.length);
            for (let i = 0; i < buffers.length; i++) {
                buffers[i] = yield fetchBuffer(model.buffers[i], modelUri);
            }
            return new ActiveModel(model, buffers, renderer);
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
        const nodesWithMeshes = this.nodes.filter(node => node.hasMesh);
        this.hasMesh = nodesWithMeshes.length > 0;
        this.min = this.hasMesh ? nodesWithMeshes.map(node => node.min).reduce((prev, curr) => vec3.min(prev, curr)) : [-1, -1, -1];
        this.max = this.hasMesh ? nodesWithMeshes.map(node => node.max).reduce((prev, curr) => vec3.max(prev, curr)) : [+1, +1, +1];
        const s = [
            2 / Math.abs(this.max[0] - this.min[0]),
            2 / Math.abs(this.max[1] - this.min[1]),
            2 / Math.abs(this.max[2] - this.min[2]),
        ].reduce((a, b) => Math.min(a, b));
        this.positionsMat = mat4.mul(mat4.scaling(s, s, s), mat4.translation([
            -(this.min[0] + this.max[0]) / 2,
            -(this.min[1] + this.max[1]) / 2,
            -(this.min[2] + this.max[2]) / 2,
        ]));
        this.normalsMat = this.positionsMat; // mat4.transpose(mat4.inverse(this.positionsMat))
    }
    render(positionsMatrix, normalsMatrix = positionsMatrix) {
        const positionsMat = mat4.mul(positionsMatrix, this.positionsMat);
        const normalsMat = mat4.mul(normalsMatrix, this.normalsMat);
        for (let node of this.nodes) {
            node.render(positionsMat, normalsMat);
        }
    }
}
class ActiveNode {
    constructor(node, meshes, nodes) {
        this.hasMesh = node.mesh !== undefined;
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
        const minMax = lazily(() => minMaxPos(this.positionsMatrix, this.hasMesh ?
            this.children().filter(node => node.hasMesh).map(node => node.min).reduce((prev, curr) => vec3.min(prev, curr)) :
            [-1, -1, -1], this.hasMesh ?
            this.children().filter(node => node.hasMesh).map(node => node.max).reduce((prev, curr) => vec3.max(prev, curr)) :
            [+1, +1, +1]));
        this._min = lazily(() => minMax()[0]);
        this._max = lazily(() => minMax()[1]);
        nodes.push(this);
    }
    get min() {
        return this._min();
    }
    get max() {
        return this._max();
    }
    render(parentPositionsMatrix, parentNormalsMatrix = parentPositionsMatrix) {
        const positionsMatrix = mat4.mul(parentPositionsMatrix, this.positionsMatrix);
        const normalsMatrix = mat4.mul(parentNormalsMatrix, this.normalsMatrix);
        for (let child of this.children()) {
            child.render(positionsMatrix, normalsMatrix);
        }
    }
}
function minMaxPos(mat, min, max) {
    let positions = [
        [min[0], min[1], min[2], 1],
        [min[0], min[1], max[2], 1],
        [min[0], max[1], min[2], 1],
        [min[0], max[1], max[2], 1],
        [max[0], min[1], min[2], 1],
        [max[0], min[1], max[2], 1],
        [max[0], max[1], min[2], 1],
        [max[0], max[1], max[2], 1],
    ];
    positions = positions.map(p => mat4.apply(mat, p));
    const minPos = positions.reduce((prev, curr) => vec4.min(prev, curr));
    const maxPos = positions.reduce((prev, curr) => vec4.max(prev, curr));
    return [
        [minPos[0], minPos[1], minPos[2]],
        [maxPos[0], maxPos[1], maxPos[2]],
    ];
}
class ActiveMesh {
    constructor(mesh, accessors, renderer) {
        this.renderer = renderer;
        this.hasMesh = true;
        this.primitives = mesh.primitives.map(primitive => new ActiveMeshPrimitive(primitive, accessors, renderer));
        this.min = this.primitives.map(primitive => primitive.min).reduce((prev, curr) => vec3.min(prev, curr));
        this.max = this.primitives.map(primitive => primitive.max).reduce((prev, curr) => vec3.max(prev, curr));
    }
    render(parentPositionsMatrix, parentNormalsMatrix = parentPositionsMatrix) {
        this.renderer.positionsMat = parentPositionsMatrix;
        this.renderer.normalsMat = parentNormalsMatrix;
        for (const primitive of this.primitives) {
            primitive.render();
        }
    }
}
class ActiveMeshPrimitive {
    constructor(meshPrimitive, accessors, renderer) {
        this.sideEffects = [];
        const accessor = accessors[meshPrimitive.attributes["POSITION"]].accessor;
        this.min = accessor.min ? [accessor.min[0], accessor.min[1], accessor.min[2]] : [-1, -1, -1];
        this.max = accessor.max ? [accessor.max[0], accessor.max[1], accessor.max[2]] : [+1, +1, +1];
        const indicesAccessor = meshPrimitive.indices !== undefined ? accessors[meshPrimitive.indices] : null;
        let count = indicesAccessor ? indicesAccessor.accessor.count : Number.MAX_SAFE_INTEGER;
        for (let attributeName in meshPrimitive.attributes) {
            const accessorIndex = meshPrimitive.attributes[attributeName];
            const accessor = accessors[accessorIndex];
            this.sideEffects.push(() => accessor.bindTo(attributeName));
            if (!indicesAccessor && accessor.accessor.count < count) {
                count = accessor.accessor.count;
            }
        }
        count %= Number.MAX_SAFE_INTEGER;
        if (indicesAccessor) {
            renderer.setIndexComponentType(indicesAccessor.accessor.componentType);
            this.sideEffects.push(indicesAccessor.bindToIndex);
        }
        const mode = meshPrimitive.mode !== undefined ? meshPrimitive.mode : WebGLRenderingContext.TRIANGLES;
        this.sideEffects.push(indicesAccessor ?
            () => { var _a; return renderer.draw(indicesAccessor.accessor.componentType, mode, count, (_a = indicesAccessor.accessor.byteOffset) !== null && _a !== void 0 ? _a : 0); } :
            () => renderer.drawIndexed(mode, count, 0));
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