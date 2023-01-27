import { required, StrictOmit } from "../utils.js"
import { Device } from "./device.js"
import { CommandEncoder } from "./encoder.js"
import { Element } from "./types.js"
import { Resource } from "./utils.js"

type Writer = (bufferOffset: number, data: DataView, dataOffset: number, size: number) => Promise<Buffer>
type Reader = (bufferOffset: number, data: DataView, dataOffset: number, size: number) => Promise<DataView>

export class Buffer implements Resource {

    private _buffer: GPUBuffer
    private _descriptor: GPUBufferDescriptor
    private _size: number
    private _strideCount: number
    
    private writer: Writer
    private reader: Reader

    constructor(label: string, readonly device: Device, readonly usage: GPUBufferUsageFlags, dataOrSize: DataView | number, readonly stride: number = size(dataOrSize)) {
        [this._buffer, this._descriptor, this._size] = typeof dataOrSize === 'number' ?
            this.newBlankBuffer(label, dataOrSize) :
            this.newBuffer(label, dataOrSize)

        this._strideCount = Math.ceil(this._size / stride)

        this.writer = (usage & GPUBufferUsage.MAP_WRITE) != 0 ?
            (bufferOffset, data, dataOffset, size) => this.writeToMapWriteBuffer(bufferOffset, data, dataOffset, size) :
            (bufferOffset, data, dataOffset, size) => this.writeToCopyDstBuffer(bufferOffset, data, dataOffset, size)

        this.reader = (usage & GPUBufferUsage.MAP_READ) != 0 ?
            (bufferOffset, data, dataOffset, size) => this.readFromMapReadBuffer(bufferOffset, data, dataOffset, size) :
            (bufferOffset, data, dataOffset, size) => this.readFromCopySrcBuffer(bufferOffset, data, dataOffset, size)
    }

    get buffer(): GPUBuffer {
        return this._buffer
    }

    get descriptor(): Readonly<GPUBufferDescriptor> {
        return this._descriptor
    }

    get label() {
        return required(this._descriptor.label)
    }

    get stridesCount(): number {
        return this._strideCount
    }

    destroy() {
        this._buffer.destroy()
    }

    asBindingResource(binding: StrictOmit<GPUBufferBinding, "buffer"> = {}): GPUBindingResource {
        return {
            ...binding,
            buffer: this._buffer,
        }
    }
    
    setData(data: DataView) {
        this._size = data.byteLength
        this._strideCount = Math.ceil(this._size / this.stride)
        if (this._size > this._descriptor.size) {
            this._buffer.destroy();
            [this._buffer, this._descriptor] = this.newBuffer(this.label, data)
        } else {
            this.writeAt(0, data)
        }
    }

    async writeAt(bufferOffset: number, data: DataView, dataOffset = 0, size: number = data.byteLength): Promise<Buffer> {
        return await this.writer(bufferOffset, data, dataOffset, size)
    }

    async readAt(bufferOffset: number, data: DataView, dataOffset = 0, size: number = data.byteLength): Promise<DataView> {
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
        this.device.enqueueCommand(`copy-${that._buffer.label}-to-${this._buffer.label}`, (encoder: CommandEncoder) => {
            encoder.encoder.copyBufferToBuffer(that.buffer, thatValidOffset, this.buffer, thisValidOffset, validSize)
        })
    }
    
    private newBlankBuffer(label: string, size: number): [GPUBuffer, GPUBufferDescriptor, number] {
        const descriptor = {
            usage: this.usage,
            size: upperMultipleOf(4, size),
            label: label
        }
        return [this.device.device.createBuffer(descriptor), descriptor, size]
    }

    private newBuffer(label: string, data: DataView): [GPUBuffer, GPUBufferDescriptor, number] {
        const validSize = upperMultipleOf(4, data.byteLength)
        const descriptor = {
            usage: this.usage,
            size: validSize,
            mappedAtCreation: true,
            label: label
        }
        const buffer = this.device.device.createBuffer(descriptor)
        const range = buffer.getMappedRange(0, validSize)
        const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        const dst = new Uint8Array(range, 0, data.byteLength)
        dst.set(src)
        buffer.unmap()
        return [buffer, descriptor, data.byteLength]
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
        const temp = this.device.buffer(`${this._descriptor.label}-temp`, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, size)
        try {
            temp.copyAt(0, this, bufferOffset, size)
            return await temp.readFromMapReadBuffer(0, data, dataOffset, size)
        } finally {
            temp.destroy()
        }
    }

}

export class SyncBuffer implements GPUBufferBinding {

    private dirtyRange: [number, number]

    private constructor(readonly gpuBuffer: Buffer, readonly cpuBuffer: DataView) {
        this.dirtyRange = [cpuBuffer.byteLength, 0]
    }

    get buffer() {
        return this.gpuBuffer.buffer
    }

    get<T>(element: Element<T>): T {
        return element.read(this.cpuBuffer)
    }

    set<T>(element: Element<T>, value: T) {
        element.write(this.cpuBuffer, value)
        this.dirty(element.range())
    }

    private dirty(range: [number, number]) {
        if (this.dirtyRange[0] > this.dirtyRange[1]) {
            setTimeout(() => this.clean())
        }
        if (range[0] < this.dirtyRange[0]) {
            this.dirtyRange[0] = range[0]
        }
        if (range[1] > this.dirtyRange[1]) {
            this.dirtyRange[1] = range[1]
        }
    }

    private clean() {
        this.gpuBuffer.writeAt(this.dirtyRange[0], this.cpuBuffer, this.dirtyRange[0], this.dirtyRange[1] - this.dirtyRange[0])
        this.dirtyRange[0] = this.cpuBuffer.byteLength
        this.dirtyRange[1] = 0
    }

    static create(label: string, device: Device, usage: GPUBufferUsageFlags, dataOrSize: DataView | number, stride: number = size(dataOrSize)) {
        const gpuBuffer = new Buffer(label, device, usage, dataOrSize, stride)
        const cpuBuffer = typeof dataOrSize === 'number' ? new DataView(new ArrayBuffer(dataOrSize)) : dataOrSize
        return new SyncBuffer(gpuBuffer, cpuBuffer)
    }

}

function size(dataOrSize: number | DataView): number {
    return typeof dataOrSize === 'number' ? dataOrSize : dataOrSize.byteLength
}

function upperMultipleOf(n: number, value: number): number {
    return Math.ceil(value / n) * n
}

function lowerMultipleOf(n: number, value: number): number {
    return Math.floor(value / n) * n
}