import { Device } from "./device.js"

export type TypedArray = 
    Float32Array |
    Int32Array |
    Int16Array |
    Int8Array |
    Uint32Array |
    Uint16Array |
    Uint8Array

type Writer = (bufferOffset: number, data: TypedArray, dataOffset: number, size: number) => Promise<Buffer>
type Reader = (bufferOffset: number, data: TypedArray, dataOffset: number, size: number) => Promise<TypedArray>

export class Buffer {

    private _buffer: GPUBuffer
    private _size: number
    private _strideCount: number
    private _capacity: number
    
    private writer: Writer
    private reader: Reader

    constructor(readonly device: Device, readonly usage: GPUBufferUsageFlags, readonly stride: number, dataOrSize: TypedArray | number = 1) {
        [this._buffer, this._size] = typeof dataOrSize === 'number' ?
            [this.newBlankBuffer(dataOrSize), dataOrSize] :
            [this.newBuffer(dataOrSize), dataOrSize.byteLength]

        this._strideCount = positiveInteger(this._size / stride)
        this._capacity = upperMultipleOf(4, this._size)

        this.writer = (usage & GPUBufferUsage.MAP_WRITE) != 0 ?
            (bufferOffset, data, dataOffset, size) => this.writeToMapWriteBuffer(bufferOffset, data, dataOffset, size) :
            (bufferOffset, data, dataOffset, size) => this.writeToCopyDstBuffer(bufferOffset, data, dataOffset, size)

        this.reader = (usage & GPUBufferUsage.MAP_READ) != 0 ?
            (bufferOffset, data, dataOffset, size) => this.readFromMapReadBuffer(bufferOffset, data, dataOffset, size) :
            (bufferOffset, data, dataOffset, size) => this.readFromCopySrcBuffer(bufferOffset, data, dataOffset, size)
    }

    destroy() {
        this._buffer.destroy()
    }

    async writeAt(bufferOffset: number, data: TypedArray, dataOffset: number = 0, size: number = data.length): Promise<Buffer> {
        return await this.writer(bufferOffset, data, dataOffset, size)
    }

    async readAt(bufferOffset: number, data: TypedArray, dataOffset: number = 0, size: number = data.length): Promise<TypedArray> {
        return await this.reader(bufferOffset, data, dataOffset, size)
    }

    copyAt(thisOffset: number, that: Buffer, thatOffset: number, size: number) {
        const thisValidOffset = lowerMultipleOf(4, thisOffset)
        const thatValidOffset = lowerMultipleOf(4, thatOffset)
        const thisOffsetCorrection = thisOffset - thisValidOffset
        const thatOffsetCorrection = thatOffset - thatValidOffset
        if (thatOffsetCorrection !== thisOffsetCorrection) {
            throw new Error("Copying between unaligned buffers is not possible!")
        }
        const validSize = upperMultipleOf(4, size + thisOffsetCorrection)
        const device = this.device.device
        device.queue.submit([
            this.device.encodeCommand(encoder => {
                encoder.encoder.copyBufferToBuffer(that.buffer, thatValidOffset, this.buffer, thisValidOffset, validSize)
            })
        ])
    }
    
    private newBlankBuffer(size: number): GPUBuffer {
        return this.device.device.createBuffer({
            usage: this.usage,
            size: upperMultipleOf(4, size),
        })
    }

    private newBuffer(data: TypedArray) {
        const validSize = upperMultipleOf(4, data.byteLength)
        const buffer = this.device.device.createBuffer({
            usage: this.usage,
            size: validSize,
            mappedAtCreation: true,
        })
        const range = buffer.getMappedRange(0, validSize)
        const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        const dst = new Uint8Array(range, 0, data.byteLength)
        dst.set(src)
        buffer.unmap()
        return buffer
    }

    private async writeToMapWriteBuffer(bufferOffset: number, data: TypedArray, dataOffset: number, size: number) {
        const bpe = data.BYTES_PER_ELEMENT
        const sizeInBytes = size * bpe
        const dataOffsetInBytes = data.byteOffset + dataOffset * bpe
        const validBufferOffset = lowerMultipleOf(8, bufferOffset)
        const offsetCorrection = bufferOffset - validBufferOffset
        const validSize = upperMultipleOf(4, sizeInBytes + offsetCorrection)
        return await this._buffer.mapAsync(GPUMapMode.WRITE, validBufferOffset, validSize).then(() => {
            const range = this._buffer.getMappedRange(validBufferOffset, validSize)
            const src = new Uint8Array(data.buffer, dataOffsetInBytes, sizeInBytes)
            const dst = new Uint8Array(range, offsetCorrection, sizeInBytes)
            dst.set(src)
            this._buffer.unmap()
            return this
        })
    }

    private async readFromMapReadBuffer(bufferOffset: number, data: TypedArray, dataOffset: number, size: number): Promise<TypedArray> {
        const bpe = data.BYTES_PER_ELEMENT
        const sizeInBytes = size * bpe
        const dataOffsetInBytes = data.byteOffset + dataOffset * bpe
        const validBufferOffset = lowerMultipleOf(8, bufferOffset)
        const offsetCorrection = bufferOffset - validBufferOffset
        const validSize = upperMultipleOf(4, sizeInBytes + offsetCorrection)
        return await this.buffer.mapAsync(GPUMapMode.READ, validBufferOffset, validSize).then(() => {
            const range = this._buffer.getMappedRange(validBufferOffset, validSize)
            const src = new Uint8Array(range, offsetCorrection, sizeInBytes)
            const dst = new Uint8Array(data.buffer, dataOffsetInBytes, sizeInBytes)
            dst.set(src)
            this._buffer.unmap()
            return data
        })
    }
    
    private writeToCopyDstBuffer(bufferOffset: number, data: TypedArray, dataOffset: number, size: number): Promise<Buffer> {
        const bpe = data.BYTES_PER_ELEMENT
        const sizeInBytes = size * bpe
        const dataOffsetInBytes = data.byteOffset + dataOffset * bpe
        const validBufferOffset = lowerMultipleOf(4, bufferOffset)
        const offsetCorrection = bufferOffset - validBufferOffset
        const validDataOffset = dataOffsetInBytes - offsetCorrection
        const validSize = upperMultipleOf(4, sizeInBytes + offsetCorrection)
        this.device.device.queue.writeBuffer(this._buffer, validBufferOffset, data.buffer, validDataOffset, validSize)
        return Promise.resolve(this)
    }

    private async readFromCopySrcBuffer(bufferOffset: number, data: TypedArray, dataOffset: number, size: number): Promise<TypedArray> {
        const temp = this.device.buffer(GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, size)
        try {
            temp.copyAt(0, this, bufferOffset, size)
            return await temp.readFromMapReadBuffer(0, data, dataOffset, size)
        } finally {
            temp.destroy()
        }
    }
    
    get buffer(): GPUBuffer {
        return this._buffer
    }

    get stridesCount(): number {
        return this._strideCount
    }

    setData(data: TypedArray) {
        this._size = data.byteLength
        this._strideCount = positiveInteger(this._size / this.stride)
        if (this._size > this._capacity) {
            this._capacity = upperMultipleOf(4, this._size)
            this._buffer.destroy()
            this._buffer = this.newBuffer(data)
        } else {
            this.writeAt(0, data)
        }
    }

}

function positiveInteger(n: number) {
    if (!Number.isSafeInteger(n) || n < 0) {
        throw new Error(`${n} is not a positive integer!`)
    }
    return n
}

function upperMultipleOf(n: number, value: number): number {
    return Math.ceil(value / n) * n
}

function lowerMultipleOf(n: number, value: number): number {
    return Math.floor(value / n) * n
}