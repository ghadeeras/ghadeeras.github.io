var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether } from "/gen/libs.js";
import { failure } from "../utils.js";
export function fetchBuffers(bufferRefs, baseUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const buffers = new Array(bufferRefs.length);
        for (let i = 0; i < buffers.length; i++) {
            buffers[i] = yield fetchBuffer(bufferRefs[i], baseUri);
        }
        return buffers;
    });
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
export function matrixOf(node) {
    let matrix = node.matrix !== undefined ?
        aether.mat4.from(node.matrix) :
        aether.mat4.identity();
    matrix = node.translation !== undefined ?
        aether.mat4.mul(matrix, aether.mat4.translation(node.translation)) :
        matrix;
    matrix = node.rotation !== undefined ?
        aether.mat4.mul(matrix, aether.mat4.cast(aether.quat.toMatrix(node.rotation))) :
        matrix;
    matrix = node.scale !== undefined ?
        aether.mat4.mul(matrix, aether.mat4.scaling(...node.scale)) :
        matrix;
    return matrix;
}
export function enrichBufferViews(model) {
    var _a;
    for (const mesh of model.meshes) {
        for (const primitive of mesh.primitives) {
            if (primitive.indices !== undefined) {
                const accessor = model.accessors[primitive.indices];
                const bufferView = model.bufferViews[(_a = accessor.bufferView) !== null && _a !== void 0 ? _a : failure("Using zero buffers not supported yet!")];
                bufferView.target = WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER;
                if (bufferView.byteStride === undefined && accessor.componentType == WebGL2RenderingContext.UNSIGNED_BYTE) {
                    bufferView.byteStride = 1;
                }
            }
        }
    }
}
//# sourceMappingURL=gltf.js.map