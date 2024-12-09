import { gpu } from "lumen"
import * as aether from "aether"

export class FieldSampler {

    private static uniformsStruct = gpu.struct({
        matrix: gpu.mat3x3,
        displacement: gpu.f32.x3,
        scale: gpu.f32,
        depth: gpu.u32,
    }) 

    private static SIZE = 128;

    private pipeline: GPUComputePipeline
    private bindGroup: GPUBindGroup

    private uniformsBuffer: gpu.SyncBuffer

    readonly fieldTexture: gpu.Texture

    constructor(private shader: gpu.ShaderModule) {
        const device = shader.device
        this.pipeline = shader.computePipeline("c_main")
        const fieldComputeBidGroupLayout = this.pipeline.getBindGroupLayout(0)
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
        this.uniformsBuffer = device.syncBuffer("uniforms-buffer", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, FieldSampler.uniformsStruct.view([{
            matrix: aether.mat3.rotation(Math.PI / Math.SQRT2, [1, 2, 3]),
            displacement: aether.vec3.of(Math.sqrt(1 / 2), Math.sqrt(1 / 3), Math.sqrt(1 / 5)),
            scale: Math.SQRT1_2,
            depth: 5
        }]))
        this.bindGroup = device.bindGroup(fieldComputeBidGroupLayout, [this.fieldTexture.createView({
            dimension: "3d",
        }), this.uniformsBuffer])
    }

    get matrix() {
        return this.uniformsBuffer.get(FieldSampler.uniformsStruct.members.matrix)
    }

    set matrix(m: aether.Mat3) {
        this.uniformsBuffer.set(FieldSampler.uniformsStruct.members.matrix, m)
    }

    get depth() {
        return this.uniformsBuffer.get(FieldSampler.uniformsStruct.members.depth)
    }

    set depth(d: number) {
        if (d >= 0 && d <= 9) {
            this.uniformsBuffer.set(FieldSampler.uniformsStruct.members.depth, d)
        }
    }

    get scale() {
        return this.uniformsBuffer.get(FieldSampler.uniformsStruct.members.scale)
    }

    set scale(s: number) {
        if (s >= Math.SQRT1_2 && s <= Math.SQRT2) {
            this.uniformsBuffer.set(FieldSampler.uniformsStruct.members.scale, s)
        }
    }

    sample() {
        const device = this.shader.device
        device.enqueueCommand("field-sampler-command", encoder => {
            encoder.computePass(pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.bindGroup)
                pass.dispatchWorkgroups(FieldSampler.SIZE / 4, FieldSampler.SIZE / 4, FieldSampler.SIZE / 4)
            })
        })
    }

    static async create(device: gpu.Device): Promise<FieldSampler> {
        const shader = await device.loadShaderModule("field-sampler.wgsl")
        return new FieldSampler(shader)
    }

}

