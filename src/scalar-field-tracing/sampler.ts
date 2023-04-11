import * as gpu from "../djee/gpu/index.js"

export class FieldSampler {

    private static SIZE = 128;

    private pipeline: GPUComputePipeline
    private bindGroup: GPUBindGroup

    private fieldBuffer: gpu.Buffer

    constructor(private shader: gpu.ShaderModule) {
        const device = shader.device
        this.pipeline = shader.computePipeline("c_main")
        const fieldComputeBidGroupLayout = this.pipeline.getBindGroupLayout(0)
        this.fieldBuffer = device.buffer("field-buffer", GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, (FieldSampler.SIZE ** 3) * (4 * 2))
        this.bindGroup = device.bindGroup(fieldComputeBidGroupLayout, [this.fieldBuffer])
    }

    sample(): gpu.Texture {
        const device = this.shader.device
        const texture = device.texture({
            label: "scalar-field",
            format: "rgba16float",
            dimension: "3d",
            size: {
                width: FieldSampler.SIZE,
                height: FieldSampler.SIZE,
                depthOrArrayLayers: FieldSampler.SIZE
            },
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
        })
        device.enqueueCommand("field-sampler-command", encoder => {
            encoder.computePass(pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.bindGroup)
                pass.dispatchWorkgroups(FieldSampler.SIZE / 4, FieldSampler.SIZE / 4, FieldSampler.SIZE / 4)
            })
            encoder.encoder.copyBufferToTexture(
                { 
                    buffer: this.fieldBuffer.buffer,
                    bytesPerRow: FieldSampler.SIZE * 4 * 2,
                    rowsPerImage: FieldSampler.SIZE
                }, 
                { texture: texture.texture }, 
                texture.size
            )
        })
        return texture
    }

    static async create(device: gpu.Device): Promise<FieldSampler> {
        const shader = await device.loadShaderModule("field-sampler.wgsl")
        return new FieldSampler(shader)
    }

}

