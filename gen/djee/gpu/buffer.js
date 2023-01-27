var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { required } from "../utils.js";
export class Buffer {
    constructor(label, device, usage, dataOrSize, stride = size(dataOrSize)) {
        this.device = device;
        this.usage = usage;
        this.stride = stride;
        [this._buffer, this._descriptor, this._size] = typeof dataOrSize === 'number' ?
            this.newBlankBuffer(label, dataOrSize) :
            this.newBuffer(label, dataOrSize);
        this._strideCount = Math.ceil(this._size / stride);
        this.writer = (usage & GPUBufferUsage.MAP_WRITE) != 0 ?
            (bufferOffset, data, dataOffset, size) => this.writeToMapWriteBuffer(bufferOffset, data, dataOffset, size) :
            (bufferOffset, data, dataOffset, size) => this.writeToCopyDstBuffer(bufferOffset, data, dataOffset, size);
        this.reader = (usage & GPUBufferUsage.MAP_READ) != 0 ?
            (bufferOffset, data, dataOffset, size) => this.readFromMapReadBuffer(bufferOffset, data, dataOffset, size) :
            (bufferOffset, data, dataOffset, size) => this.readFromCopySrcBuffer(bufferOffset, data, dataOffset, size);
    }
    get buffer() {
        return this._buffer;
    }
    get descriptor() {
        return this._descriptor;
    }
    get label() {
        return required(this._descriptor.label);
    }
    get stridesCount() {
        return this._strideCount;
    }
    destroy() {
        this._buffer.destroy();
    }
    asBindingResource(binding = {}) {
        return Object.assign(Object.assign({}, binding), { buffer: this._buffer });
    }
    setData(data) {
        this._size = data.byteLength;
        this._strideCount = Math.ceil(this._size / this.stride);
        if (this._size > this._descriptor.size) {
            this._buffer.destroy();
            [this._buffer, this._descriptor] = this.newBuffer(this.label, data);
        }
        else {
            this.writeAt(0, data);
        }
    }
    writeAt(bufferOffset, data, dataOffset = 0, size = data.byteLength) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.writer(bufferOffset, data, dataOffset, size);
        });
    }
    readAt(bufferOffset, data, dataOffset = 0, size = data.byteLength) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.reader(bufferOffset, data, dataOffset, size);
        });
    }
    copyAt(thisOffset, that, thatOffset, size) {
        const thisValidOffset = lowerMultipleOf(4, thisOffset);
        const thatValidOffset = lowerMultipleOf(4, thatOffset);
        const thisOffsetCorrection = thisOffset - thisValidOffset;
        const thatOffsetCorrection = thatOffset - thatValidOffset;
        if (thatOffsetCorrection !== thisOffsetCorrection) {
            throw new Error("Copying between unaligned buffers is not possible!");
        }
        const validSize = upperMultipleOf(4, size + thisOffsetCorrection);
        this.device.enqueueCommand(`copy-${that._buffer.label}-to-${this._buffer.label}`, (encoder) => {
            encoder.encoder.copyBufferToBuffer(that.buffer, thatValidOffset, this.buffer, thisValidOffset, validSize);
        });
    }
    newBlankBuffer(label, size) {
        const descriptor = {
            usage: this.usage,
            size: upperMultipleOf(4, size),
            label: label
        };
        return [this.device.device.createBuffer(descriptor), descriptor, size];
    }
    newBuffer(label, data) {
        const validSize = upperMultipleOf(4, data.byteLength);
        const descriptor = {
            usage: this.usage,
            size: validSize,
            mappedAtCreation: true,
            label: label
        };
        const buffer = this.device.device.createBuffer(descriptor);
        const range = buffer.getMappedRange(0, validSize);
        const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const dst = new Uint8Array(range, 0, data.byteLength);
        dst.set(src);
        buffer.unmap();
        return [buffer, descriptor, data.byteLength];
    }
    writeToMapWriteBuffer(bufferOffset, data, dataOffset, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataOffsetInBytes = data.byteOffset + dataOffset;
            const validBufferOffset = lowerMultipleOf(8, bufferOffset);
            const offsetCorrection = bufferOffset - validBufferOffset;
            const validSize = upperMultipleOf(4, size + offsetCorrection);
            return yield this._buffer.mapAsync(GPUMapMode.WRITE, validBufferOffset, validSize).then(() => {
                const range = this._buffer.getMappedRange(validBufferOffset, validSize);
                const src = new Uint8Array(data.buffer, dataOffsetInBytes, size);
                const dst = new Uint8Array(range, offsetCorrection, size);
                dst.set(src);
                this._buffer.unmap();
                return this;
            });
        });
    }
    readFromMapReadBuffer(bufferOffset, data, dataOffset, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataOffsetInBytes = data.byteOffset + dataOffset;
            const validBufferOffset = lowerMultipleOf(8, bufferOffset);
            const offsetCorrection = bufferOffset - validBufferOffset;
            const validSize = upperMultipleOf(4, size + offsetCorrection);
            return yield this.buffer.mapAsync(GPUMapMode.READ, validBufferOffset, validSize).then(() => {
                const range = this._buffer.getMappedRange(validBufferOffset, validSize);
                const src = new Uint8Array(range, offsetCorrection, size);
                const dst = new Uint8Array(data.buffer, dataOffsetInBytes, size);
                dst.set(src);
                this._buffer.unmap();
                return data;
            });
        });
    }
    writeToCopyDstBuffer(bufferOffset, data, dataOffset, size) {
        const dataOffsetInBytes = data.byteOffset + dataOffset;
        const validBufferOffset = lowerMultipleOf(4, bufferOffset);
        const offsetCorrection = bufferOffset - validBufferOffset;
        const validDataOffset = dataOffsetInBytes - offsetCorrection;
        const validSize = upperMultipleOf(4, size + offsetCorrection);
        this.device.device.queue.writeBuffer(this._buffer, validBufferOffset, data.buffer, validDataOffset, validSize);
        return Promise.resolve(this);
    }
    readFromCopySrcBuffer(bufferOffset, data, dataOffset, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const temp = this.device.buffer(`${this._descriptor.label}-temp`, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, size);
            try {
                temp.copyAt(0, this, bufferOffset, size);
                return yield temp.readFromMapReadBuffer(0, data, dataOffset, size);
            }
            finally {
                temp.destroy();
            }
        });
    }
}
export class SyncBuffer {
    constructor(gpuBuffer, cpuBuffer) {
        this.gpuBuffer = gpuBuffer;
        this.cpuBuffer = cpuBuffer;
        this.dirtyRange = [cpuBuffer.byteLength, 0];
    }
    get buffer() {
        return this.gpuBuffer.buffer;
    }
    get(element) {
        return element.read(this.cpuBuffer);
    }
    set(element, value) {
        element.write(this.cpuBuffer, value);
        this.dirty(element.range());
    }
    dirty(range) {
        if (this.dirtyRange[0] > this.dirtyRange[1]) {
            setTimeout(() => this.clean());
        }
        if (range[0] < this.dirtyRange[0]) {
            this.dirtyRange[0] = range[0];
        }
        if (range[1] > this.dirtyRange[1]) {
            this.dirtyRange[1] = range[1];
        }
    }
    clean() {
        this.gpuBuffer.writeAt(this.dirtyRange[0], this.cpuBuffer, this.dirtyRange[0], this.dirtyRange[1] - this.dirtyRange[0]);
        this.dirtyRange[0] = this.cpuBuffer.byteLength;
        this.dirtyRange[1] = 0;
    }
    static create(label, device, usage, dataOrSize, stride = size(dataOrSize)) {
        const gpuBuffer = new Buffer(label, device, usage, dataOrSize, stride);
        const cpuBuffer = typeof dataOrSize === 'number' ? new DataView(new ArrayBuffer(dataOrSize)) : dataOrSize;
        return new SyncBuffer(gpuBuffer, cpuBuffer);
    }
}
function size(dataOrSize) {
    return typeof dataOrSize === 'number' ? dataOrSize : dataOrSize.byteLength;
}
function upperMultipleOf(n, value) {
    return Math.ceil(value / n) * n;
}
function lowerMultipleOf(n, value) {
    return Math.floor(value / n) * n;
}
//# sourceMappingURL=buffer.js.map