import { failure } from "../utils";
export class GPURenderer {
    constructor(device, attributes, positionsMatSetter, normalsMatSetter) {
        this.device = device;
        this.attributes = attributes;
        this.positionsMatSetter = positionsMatSetter;
        this.normalsMatSetter = normalsMatSetter;
        this.zeroBuffer = this.newAttributesBuffer(16, 0, 16, new Uint32Array([0, 0, 0, 0]));
        for (const key of Object.keys(attributes)) {
            this.setToZero(key);
        }
    }
    newIndicesBuffer(byteOffset, byteLength, data) {
        return this.device.buffer(GPUBufferUsage.INDEX, new DataView(data, byteOffset, byteLength));
    }
    newAttributesBuffer(byteStride, byteOffset, byteLength, data) {
        return this.device.buffer(GPUBufferUsage.VERTEX, new DataView(data, byteOffset, byteLength), byteStride);
    }
    deleteBuffer(buffer) {
        buffer.destroy();
    }
    bind(attributeName, buffer, accessor) {
        failure("Not implemented yet!");
    }
    bindIndices(buffer) {
        failure("Not implemented yet!");
    }
    setToZero(attributeName) {
        this.bind(attributeName, this.zeroBuffer, {
            componentType: WebGLRenderingContext.FLOAT,
            count: 1,
            type: "VEC4"
        });
    }
    setIndexComponentType(componentType) {
        failure("Not implemented yet!");
    }
    drawIndexed(componentType, mode, count, byteOffset) {
        failure("Not implemented yet!");
    }
    draw(mode, count, byteOffset) {
        failure("Not implemented yet!");
    }
    setPositionsMat(mat) {
        this.positionsMatSetter(mat);
    }
    setNormalsMat(mat) {
        this.normalsMatSetter(mat);
    }
}
//# sourceMappingURL=gltf.gpu.js.map