var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Buffer {
    constructor(device, usage, stride, dataOrSize = 1) {
        this.device = device;
        this.usage = usage;
        this.stride = stride;
        [this._buffer, this._size] = typeof dataOrSize === 'number' ?
            [this.newBlankBuffer(dataOrSize), dataOrSize] :
            [this.newBuffer(dataOrSize), dataOrSize.byteLength];
        this._strideCount = positiveInteger(this._size / stride);
        this._capacity = upperMultipleOf(4, this._size);
        this.writer = (usage & GPUBufferUsage.MAP_WRITE) != 0 ?
            (bufferOffset, data, dataOffset, size) => this.writeToMapWriteBuffer(bufferOffset, data, dataOffset, size) :
            (bufferOffset, data, dataOffset, size) => this.writeToCopyDstBuffer(bufferOffset, data, dataOffset, size);
        this.reader = (usage & GPUBufferUsage.MAP_READ) != 0 ?
            (bufferOffset, data, dataOffset, size) => this.readFromMapReadBuffer(bufferOffset, data, dataOffset, size) :
            (bufferOffset, data, dataOffset, size) => this.readFromCopySrcBuffer(bufferOffset, data, dataOffset, size);
    }
    destroy() {
        this._buffer.destroy();
    }
    writeAt(bufferOffset, data, dataOffset = 0, size = data.length) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.writer(bufferOffset, data, dataOffset, size);
        });
    }
    readAt(bufferOffset, data, dataOffset = 0, size = data.length) {
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
        const device = this.device.device;
        device.queue.submit([
            this.device.encodeCommand(encoder => {
                encoder.encoder.copyBufferToBuffer(that.buffer, thatValidOffset, this.buffer, thisValidOffset, validSize);
            })
        ]);
    }
    newBlankBuffer(size) {
        return this.device.device.createBuffer({
            usage: this.usage,
            size: upperMultipleOf(4, size),
        });
    }
    newBuffer(data) {
        const validSize = upperMultipleOf(4, data.byteLength);
        const buffer = this.device.device.createBuffer({
            usage: this.usage,
            size: validSize,
            mappedAtCreation: true,
        });
        const range = buffer.getMappedRange(0, validSize);
        const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const dst = new Uint8Array(range, 0, data.byteLength);
        dst.set(src);
        buffer.unmap();
        return buffer;
    }
    writeToMapWriteBuffer(bufferOffset, data, dataOffset, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const bpe = data.BYTES_PER_ELEMENT;
            const sizeInBytes = size * bpe;
            const dataOffsetInBytes = data.byteOffset + dataOffset * bpe;
            const validBufferOffset = lowerMultipleOf(8, bufferOffset);
            const offsetCorrection = bufferOffset - validBufferOffset;
            const validSize = upperMultipleOf(4, sizeInBytes + offsetCorrection);
            return yield this._buffer.mapAsync(GPUMapMode.WRITE, validBufferOffset, validSize).then(() => {
                const range = this._buffer.getMappedRange(validBufferOffset, validSize);
                const src = new Uint8Array(data.buffer, dataOffsetInBytes, sizeInBytes);
                const dst = new Uint8Array(range, offsetCorrection, sizeInBytes);
                dst.set(src);
                this._buffer.unmap();
                return this;
            });
        });
    }
    readFromMapReadBuffer(bufferOffset, data, dataOffset, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const bpe = data.BYTES_PER_ELEMENT;
            const sizeInBytes = size * bpe;
            const dataOffsetInBytes = data.byteOffset + dataOffset * bpe;
            const validBufferOffset = lowerMultipleOf(8, bufferOffset);
            const offsetCorrection = bufferOffset - validBufferOffset;
            const validSize = upperMultipleOf(4, sizeInBytes + offsetCorrection);
            return yield this.buffer.mapAsync(GPUMapMode.READ, validBufferOffset, validSize).then(() => {
                const range = this._buffer.getMappedRange(validBufferOffset, validSize);
                const src = new Uint8Array(range, offsetCorrection, sizeInBytes);
                const dst = new Uint8Array(data.buffer, dataOffsetInBytes, sizeInBytes);
                dst.set(src);
                this._buffer.unmap();
                return data;
            });
        });
    }
    writeToCopyDstBuffer(bufferOffset, data, dataOffset, size) {
        const bpe = data.BYTES_PER_ELEMENT;
        const sizeInBytes = size * bpe;
        const dataOffsetInBytes = data.byteOffset + dataOffset * bpe;
        const validBufferOffset = lowerMultipleOf(4, bufferOffset);
        const offsetCorrection = bufferOffset - validBufferOffset;
        const validDataOffset = dataOffsetInBytes - offsetCorrection;
        const validSize = upperMultipleOf(4, sizeInBytes + offsetCorrection);
        this.device.device.queue.writeBuffer(this._buffer, validBufferOffset, data.buffer, validDataOffset, validSize);
        return Promise.resolve(this);
    }
    readFromCopySrcBuffer(bufferOffset, data, dataOffset, size) {
        return __awaiter(this, void 0, void 0, function* () {
            const temp = this.device.buffer(GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, size);
            try {
                temp.copyAt(0, this, bufferOffset, size);
                return yield temp.readFromMapReadBuffer(0, data, dataOffset, size);
            }
            finally {
                temp.destroy();
            }
        });
    }
    get buffer() {
        return this._buffer;
    }
    get stridesCount() {
        return this._strideCount;
    }
    setData(data) {
        this._size = data.byteLength;
        this._strideCount = positiveInteger(this._size / this.stride);
        if (this._size > this._capacity) {
            this._capacity = upperMultipleOf(4, this._size);
            this._buffer.destroy();
            this._buffer = this.newBuffer(data);
        }
        else {
            this.writeAt(0, data);
        }
    }
}
function positiveInteger(n) {
    if (!Number.isSafeInteger(n) || n < 0) {
        throw new Error(`${n} is not a positive integer!`);
    }
    return n;
}
function upperMultipleOf(n, value) {
    return Math.ceil(value / n) * n;
}
function lowerMultipleOf(n, value) {
    return Math.floor(value / n) * n;
}
//# sourceMappingURL=buffer.js.map