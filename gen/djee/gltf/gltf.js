import { aether } from "/gen/libs.js";
import { failure } from "../utils.js";
export async function fetchBuffers(bufferRefs, baseUri) {
    const buffers = new Array(bufferRefs.length);
    for (let i = 0; i < buffers.length; i++) {
        buffers[i] = await fetchBuffer(bufferRefs[i], baseUri);
    }
    return buffers;
}
async function fetchBuffer(bufferRef, baseUri) {
    const url = new URL(bufferRef.uri, baseUri);
    const response = await fetch(url.href);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer.byteLength == bufferRef.byteLength ?
        arrayBuffer :
        failure(`Buffer at '${bufferRef.uri}' does not have expected length of ${bufferRef.byteLength} bytes!`);
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
    for (const mesh of model.meshes) {
        for (const primitive of mesh.primitives) {
            if (primitive.indices !== undefined) {
                const accessor = model.accessors[primitive.indices];
                const bufferView = model.bufferViews[accessor.bufferView ?? failure("Using zero buffers not supported yet!")];
                bufferView.target = WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER;
                if (bufferView.byteStride === undefined && accessor.componentType == WebGL2RenderingContext.UNSIGNED_BYTE) {
                    bufferView.byteStride = 1;
                }
            }
        }
    }
}
//# sourceMappingURL=gltf.js.map