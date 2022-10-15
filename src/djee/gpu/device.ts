import { required } from "../utils.js"
import { Buffer, SyncBuffer } from "./buffer.js"
import { Canvas } from "./canvas.js"
import { CommandEncoder } from "./encoder.js"
import { ShaderModule } from "./shader.js"
import { Texture, Sampler } from "./texture.js"

export class Device {

    constructor(readonly device: GPUDevice, readonly adapter: GPUAdapter) {
    }

    async loadShaderModule(shaderName: string, templateFunction: (code: string) => string = s => s, basePath = "/shaders"): Promise<ShaderModule> {
        const response = await fetch(`${basePath}/${shaderName}`, { method : "get", mode : "no-cors" })
        const rawShaderCode = await response.text()
        return await this.shaderModule(shaderName, rawShaderCode, templateFunction)
    }
    
    async shaderModule(shaderName: string, rawShaderCode: string, templateFunction: (code: string) => string = s => s): Promise<ShaderModule> {
        const shaderCode = templateFunction(rawShaderCode)
        const shaderModule = new ShaderModule(shaderName, this, shaderCode)

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

    canvas(element: HTMLCanvasElement | string, withMultiSampling = true): Canvas {
        return new Canvas(this, element, withMultiSampling)
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

    bindGroup(bindGroupLayout: GPUBindGroupLayout, resources: GPUBindingResource[]) {
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: resources.map((resource, index) => ({
                binding: index,
                resource:  resource,
            }))
        })
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
        const adapter = required(await gpu.requestAdapter())
        const device = required(await adapter.requestDevice())
        return new Device(device, adapter)
    }

}
