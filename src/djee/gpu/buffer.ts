import { Device } from "./device.js"
import { Element } from "./types.js"

type Writer = (bufferOffset: number, data: DataView, dataOffset: number, size: number) => Promise<Buffer>
type Reader = (bufferOffset: number, data: DataView, dataOffset: number, size: number) => Promise<DataView>

export class Buffer {

    private _buffer: GPUBuffer
    private _size: number
    private _strideCount: number
    private _capacity: number
    
    private writer: Writer
    private reader: Reader

    constructor(readonly device: Device, readonly usage: GPUBufferUsageFlags, dataOrSize: DataView | number, readonly stride: number = size(dataOrSize)) {
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

    async syncFrom(data: DataView, element: Element<any>, index: number = 0, count: number = 1): Promise<Buffer> {
        const [from, to] = element.range(index, count)
        return await this.writeAt(from, data, from, to - from)
    }

    async syncTo(data: DataView, element: Element<any>, index: number = 0, count: number = 1): Promise<DataView> {
        const [from, to] = element.range(index, count)
        return await this.readAt(from, data, from, to - from)
    }

    async writeAt(bufferOffset: number, data: DataView, dataOffset: number = 0, size: number = data.byteLength): Promise<Buffer> {
        return await this.writer(bufferOffset, data, dataOffset, size)
    }

    async readAt(bufferOffset: number, data: DataView, dataOffset: number = 0, size: number = data.byteLength): Promise<DataView> {
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
        this.device.enqueueCommand(encoder => {
            encoder.encoder.copyBufferToBuffer(that.buffer, thatValidOffset, this.buffer, thisValidOffset, validSize)
        })
    }
    
    private newBlankBuffer(size: number): GPUBuffer {
        return this.device.device.createBuffer({
            usage: this.usage,
            size: upperMultipleOf(4, size),
        })
    }

    private newBuffer(data: DataView) {
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

    private async writeToMapWriteBuffer(bufferOffset: number, data: DataView, dataOffset: number, size: number) {
        const dataOffsetInBytes = data.byteOffset + dataOffset
        const validBufferOffset = lowerMultipleOf(8, bufferOffset)
        const offsetCorrection = bufferOffset - validBufferOffset
        const validSize = upperMultipleOf(4, size + offsetCorrection)
        return await this._buffer.mapAsync(GPUMapMode.WRITE, validBufferOffset, validSize).then(() => {
            const range = this._buffer.getMappedRange(validBufferOffset, validSize)
            const src = new Uint8Array(data.buffer, dataOffsetInBytes, size)
            const dst = new Uint8Array(range, offsetCorrection, size)
            dst.set(src)
            this._buffer.unmap()
            return this
        })
    }

    private async readFromMapReadBuffer(bufferOffset: number, data: DataView, dataOffset: number, size: number): Promise<DataView> {
        const dataOffsetInBytes = data.byteOffset + dataOffset
        const validBufferOffset = lowerMultipleOf(8, bufferOffset)
        const offsetCorrection = bufferOffset - validBufferOffset
        const validSize = upperMultipleOf(4, size + offsetCorrection)
        return await this.buffer.mapAsync(GPUMapMode.READ, validBufferOffset, validSize).then(() => {
            const range = this._buffer.getMappedRange(validBufferOffset, validSize)
            const src = new Uint8Array(range, offsetCorrection, size)
            const dst = new Uint8Array(data.buffer, dataOffsetInBytes, size)
            dst.set(src)
            this._buffer.unmap()
            return data
        })
    }
    
    private writeToCopyDstBuffer(bufferOffset: number, data: DataView, dataOffset: number, size: number): Promise<Buffer> {
        const dataOffsetInBytes = data.byteOffset + dataOffset
        const validBufferOffset = lowerMultipleOf(4, bufferOffset)
        const offsetCorrection = bufferOffset - validBufferOffset
        const validDataOffset = dataOffsetInBytes - offsetCorrection
        const validSize = upperMultipleOf(4, size + offsetCorrection)
        this.device.device.queue.writeBuffer(this._buffer, validBufferOffset, data.buffer, validDataOffset, validSize)
        return Promise.resolve(this)
    }

    private async readFromCopySrcBuffer(bufferOffset: number, data: DataView, dataOffset: number, size: number): Promise<DataView> {
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

    setData(data: DataView) {
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

function size(dataOrSize: number | DataView): number {
    return typeof dataOrSize === 'number' ? dataOrSize : dataOrSize.byteLength
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