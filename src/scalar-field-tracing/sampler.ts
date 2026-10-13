import { gpu } from "lumen"
import * as aether from "aether"
import { GPUToy, SamplerGroup, SamplerPipeline, fieldParamsStruct } from "./toy.gpu.js";

export class FieldSampler {

    private static SIZE = 128;

    private pipeline: SamplerPipeline
    private bindGroup: SamplerGroup

    private uniformsBuffer: gpu.SyncBuffer

    readonly fieldTexture: gpu.Texture

    constructor(gpuToy: GPUToy) {
        const device = gpuToy.device
        this.pipeline = gpuToy.pipelines.sampler
        this.fieldTexture = device.texture({
            label: "scalar-field",
            format: "rgba16float",
            dimension: "3d",
            size: {
                width: FieldSampler.SIZE,
                height: FieldSampler.SIZE,
                depthOrArrayLayers: FieldSampler.SIZE
            },
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        })
        this.uniformsBuffer = device.syncBuffer({
            label: "uniforms-buffer",
            usage: ["UNIFORM"], 
            data: fieldParamsStruct.view([{
                matrix: aether.mat3.rotation(Math.PI / Math.SQRT2, [1, 2, 3]),
                displacement: aether.vec3.of(Math.sqrt(1 / 2), Math.sqrt(1 / 3), Math.sqrt(1 / 5)),
                scale: Math.SQRT1_2,
                depth: 5
            }])
        })
        this.bindGroup = gpuToy.groupLayouts.sampler.bindGroup({
            field: this.fieldTexture,
            params: this.uniformsBuffer,
        })
    }

    get matrix() {
        return this.uniformsBuffer.get(fieldParamsStruct.members.matrix)
    }

    set matrix(m: aether.Mat3) {
        this.uniformsBuffer.set(fieldParamsStruct.members.matrix, m)
    }

    get depth() {
        return this.uniformsBuffer.get(fieldParamsStruct.members.depth)
    }

    set depth(d: number) {
        if (d >= 0 && d <= 9) {
            this.uniformsBuffer.set(fieldParamsStruct.members.depth, d)
        }
    }

    get scale() {
        return this.uniformsBuffer.get(fieldParamsStruct.members.scale)
    }

    set scale(s: number) {
        if (s >= Math.SQRT1_2 && s <= Math.SQRT2) {
            this.uniformsBuffer.set(fieldParamsStruct.members.scale, s)
        }
    }

    sample() {
        this.pipeline
            .withGroups({ group: this.bindGroup })
            .dispatchWorkGroups(FieldSampler.SIZE / 4, FieldSampler.SIZE / 4, FieldSampler.SIZE / 4)
            .enqueue()
    }

}

