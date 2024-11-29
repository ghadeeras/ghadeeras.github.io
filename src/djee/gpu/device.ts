import { required, timeOut } from "../utils.js"
import { BindGroupLayout, BindGroupLayoutEntries } from "./group.js"
import { Buffer, SyncBuffer } from "./buffer.js"
import { Canvas } from "./canvas.js"
import { CommandEncoder } from "./encoder.js"
import { ShaderModule } from "./shader.js"
import { Texture, Sampler } from "./texture.js"
import { Resource } from "./utils.js"
import { PipelineLayout, PipelineLayoutEntries } from "./pipeline.js"
import { GPUObject } from "./meta.js"

export class Device extends GPUObject {

    constructor(readonly device: GPUDevice, readonly adapter: GPUAdapter) {
        super()
    }

    async loadShaderModule(relativePath: string, templateFunction: (code: string) => string = s => s, basePath = "/shaders"): Promise<ShaderModule> {
        return await this.labeledShaderModule(relativePath, relativePath, templateFunction, basePath)
    }
    
    async labeledShaderModule(label: string, relativePath: string, templateFunction: (code: string) => string = s => s, basePath = "/shaders"): Promise<ShaderModule> {
        const response = await fetch(`${basePath}/${relativePath}`, { method : "get", mode : "no-cors" })
        const rawShaderCode = await response.text()
        return await this.shaderModule(label, rawShaderCode, templateFunction)
    }
    
    async shaderModule(label: string, rawShaderCode: string, templateFunction: (code: string) => string = s => s): Promise<ShaderModule> {
        const shaderCode = templateFunction(rawShaderCode)
        const shaderModule = new ShaderModule(label, this, shaderCode)

        if (await shaderModule.hasCompilationErrors()) {
            throw new Error("Module compilation failed!")
        }

        return shaderModule
    }

    enqueueCommands(name: string, ...encodings: ((encoder: CommandEncoder) => void)[]) {
        this.enqueue(...this.commands(name, ...encodings))
    }
    
    enqueueCommand(name: string, encoding: (encoder: CommandEncoder) => void) {
        this.enqueue(this.command(name, encoding))
    }

    enqueue(...commands: GPUCommandBuffer[]) {
        this.device.queue.submit(commands)
    }
    
    commands(name: string, ...encodings: ((encoder: CommandEncoder) => void)[]): GPUCommandBuffer[] {
        return encodings.map((encoding, i) => this.command(`${name}#${i}`, encoding))
    }
    
    command(name: string, encoding: (encoder: CommandEncoder) => void): GPUCommandBuffer {
        const encoder = new CommandEncoder(name, this)
        encoding(encoder)
        return encoder.finish()
    }

    canvas(element: HTMLCanvasElement | string, sampleCount = 1): Canvas {
        return new Canvas(this, element, sampleCount)
    }

    texture(descriptor: GPUTextureDescriptor): Texture {
        return new Texture(this, descriptor)
    }

    sampler(descriptor: GPUSamplerDescriptor | undefined = undefined) {
        return new Sampler(this, descriptor)
    }

    buffer(label: string, usage: GPUBufferUsageFlags, dataOrSize: DataView | number, stride = 0): Buffer {
        return stride > 0 ? 
            new Buffer(label, this, usage, dataOrSize, stride) : 
            new Buffer(label, this, usage, dataOrSize) 
    }

    syncBuffer(label: string, usage: GPUBufferUsageFlags, dataOrSize: DataView | number, stride = 0): SyncBuffer {
        return stride > 0 ? 
            SyncBuffer.create(label, this, usage, dataOrSize, stride) : 
            SyncBuffer.create(label, this, usage, dataOrSize) 
    }

    groupLayout<L extends BindGroupLayoutEntries>(label: string, entries: L): BindGroupLayout<L> {
        return new BindGroupLayout(label, this, entries)
    }

    async pipelineLayout<L extends PipelineLayoutEntries>(label: string, entries: L): Promise<PipelineLayout<L>> {
        return await PipelineLayout.create(this, label, { bindGroupLayouts: entries })
    }

    bindGroup(bindGroupLayout: GPUBindGroupLayout, resources: (Resource | GPUBindingResource)[]) {
        const discriminator: Exclude<keyof Resource, keyof GPUBindingResource> = "asBindingResource"
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: resources.map((resource, index) => ({
                binding: index,
                resource: discriminator in resource ? resource.asBindingResource() : resource,
            }))
        })
    }

    suggestedGroupSizes() {
        const limits = this.device.limits
        const wgs = Math.max(
            limits.maxComputeWorkgroupSizeX,
            limits.maxComputeWorkgroupSizeY,
            limits.maxComputeWorkgroupSizeZ
        )
        const bitCount1D = Math.floor(Math.log2(wgs))
        const bitCount2DY = bitCount1D >>> 1
        const bitCount2DX = bitCount1D - bitCount2DY
        const bitCount3DZ = Math.floor(bitCount1D / 3)
        const bitCount3DY = (bitCount1D - bitCount3DZ) >>> 1
        const bitCount3DX = bitCount1D - bitCount2DY - bitCount3DZ
        const oneD = 1 << bitCount1D
        const twoDX = 1 << bitCount2DX
        const twoDY = 1 << bitCount2DY
        const threeDX = 1 << bitCount3DX
        const threeDY = 1 << bitCount3DY
        const threeDZ = 1 << bitCount3DZ
        return [ 
            [oneD], 
            [twoDX, twoDY ],
            [threeDX, threeDY, threeDZ]
        ]
    }
    

    async monitorErrors<T>(filter: GPUErrorFilter, expression: () => T): Promise<T> {
        this.device.pushErrorScope(filter)
        const result = expression()
        const error = await this.device.popErrorScope()
        if (error) {
            throw error
        }
        return result
    }    

    static async instance(): Promise<Device> {
        const gpu = required(navigator.gpu)
        const adapter = required(await timeOut(gpu.requestAdapter(), 5000, "GPU Adapter"))
        const device = required(await timeOut(adapter.requestDevice(), 5000, "GPU Device"))
        return new Device(device, adapter)
    }

}
