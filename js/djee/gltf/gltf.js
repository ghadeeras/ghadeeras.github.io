import * as aether from "aether";
import { failure } from "../utils.js";
export async function fetchModel(modelUri) {
    const response = await fetch(modelUri, { mode: "cors" });
    const model = await response.json();
    const buffers = await fetchBuffers(model.buffers, modelUri);
    const images = await fetchImages(model, model.bufferViews, buffers, modelUri);
    return { model, buffers, images };
}
async function fetchBuffers(bufferRefs, baseUri) {
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
async function fetchImages(model, bufferViews, buffers, modelUri) {
    const images = model.images ?? [];
    return Promise.all(images.map(i => fetchImageBitmap(i, bufferViews, buffers, modelUri)));
}
async function fetchImageBitmap(image, bufferViews, buffers, baseUri) {
    try {
        if ("uri" in image) {
            const response = await fetch(new URL(image.uri, baseUri));
            return await createImageBitmap(await response.blob());
        }
        else {
            const view = bufferViews[image.bufferView];
            const buffer = buffers[view.buffer];
            const blob = new Blob([buffer], { type: image.mimeType });
            return await createImageBitmap(blob);
        }
    }
    catch (e) {
        console.error(e, image);
        throw e;
    }
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
                if (accessor.bufferView === undefined) {
                    continue;
                }
                const bufferView = model.bufferViews[accessor.bufferView];
                bufferView.target = WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER;
                if (bufferView.byteStride === undefined && accessor.componentType == WebGL2RenderingContext.UNSIGNED_BYTE) {
                    bufferView.byteStride = 1;
                }
            }
        }
    }
}
//# sourceMappingURL=gltf.js.map