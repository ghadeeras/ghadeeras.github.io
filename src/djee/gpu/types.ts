import { Canvas } from "./canvas.js";
import { Texture } from "./texture.js";

export type TextureFormatSource =
    GPUTextureFormat |
    Texture |
    Canvas

export function formatOf(formatted: TextureFormatSource): GPUTextureFormat {
    return typeof formatted !== 'string' ?
        formatted instanceof Texture ?
            formatted.descriptor.format :
            formatted.format :
        formatted
}