import { Canvas } from "./canvas.js";
import { Texture } from "./texture.js";

export type TextureFormatSource =
    GPUTextureFormat |
    Texture |
    Canvas

export type TypedArray = 
    Float32Array |
    Int32Array |
    Int16Array |
    Int8Array |
    Uint32Array |
    Uint16Array |
    Uint8Array

export function formatOf(formatted: TextureFormatSource): GPUTextureFormat {
    return typeof formatted !== 'string' ?
        formatted instanceof Texture ?
            formatted.descriptor.format :
            formatted.format :
        formatted
}

export function dataView(array: TypedArray): DataView {
    return new DataView(array.buffer, array.byteOffset, array.byteLength)
}

export function float32Array(view: DataView): Float32Array {
    return new Float32Array(view.buffer, view.byteOffset, view.byteLength / Float32Array.BYTES_PER_ELEMENT)
}

export function int32Array(view: DataView): Int32Array {
    return new Int32Array(view.buffer, view.byteOffset, view.byteLength / Int32Array.BYTES_PER_ELEMENT)
}

export function int16Array(view: DataView): Int16Array {
    return new Int16Array(view.buffer, view.byteOffset, view.byteLength / Int16Array.BYTES_PER_ELEMENT)
}

export function uint16Array(view: DataView): Uint16Array {
    return new Uint16Array(view.buffer, view.byteOffset, view.byteLength / Uint16Array.BYTES_PER_ELEMENT)
}

export function int8Array(view: DataView): Int8Array {
    return new Int8Array(view.buffer, view.byteOffset, view.byteLength / Int8Array.BYTES_PER_ELEMENT)
}

export function uint8Array(view: DataView): Uint8Array {
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength / Uint8Array.BYTES_PER_ELEMENT)
}