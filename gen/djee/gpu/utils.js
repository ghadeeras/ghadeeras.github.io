import { Texture } from "./texture.js";
export function asColorTargetState(formatted) {
    return typeof formatted != 'string' && ("blend" in formatted || "writeMask" in formatted)
        ? formatted
        : { format: formatOf(formatted) };
}
export function formatOf(formatted) {
    return typeof formatted !== 'string' ?
        formatted instanceof Texture ?
            formatted.descriptor.format :
            formatted.format :
        formatted;
}
export function dataView(array) {
    return new DataView(array.buffer, array.byteOffset, array.byteLength);
}
export function float32Array(view) {
    return new Float32Array(view.buffer, view.byteOffset, view.byteLength / Float32Array.BYTES_PER_ELEMENT);
}
export function int32Array(view) {
    return new Int32Array(view.buffer, view.byteOffset, view.byteLength / Int32Array.BYTES_PER_ELEMENT);
}
export function int16Array(view) {
    return new Int16Array(view.buffer, view.byteOffset, view.byteLength / Int16Array.BYTES_PER_ELEMENT);
}
export function uint16Array(view) {
    return new Uint16Array(view.buffer, view.byteOffset, view.byteLength / Uint16Array.BYTES_PER_ELEMENT);
}
export function int8Array(view) {
    return new Int8Array(view.buffer, view.byteOffset, view.byteLength / Int8Array.BYTES_PER_ELEMENT);
}
export function uint8Array(view) {
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength / Uint8Array.BYTES_PER_ELEMENT);
}
//# sourceMappingURL=utils.js.map