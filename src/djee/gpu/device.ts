import { gear } from '/gen/libs.js'
import { required } from "../../utils/misc.js"
import { Buffer } from "./buffer.js"
import { Canvas } from "./canvas.js"
import { CommandEncoder } from "./encoder.js"
import { ShaderModule } from "./shader.js"
import { Texture, Sampler, TextureView } from "./texture.js"

export class Device {

    constructor(readonly device: GPUDevice, readonly adapter: GPUAdapter) {
    }

    async loadShaderModule(shaderName: string, templateFunction: (code: string) => string = s => s, basePath = "/shaders"): Promise<ShaderModule> {
        const shaderCodes = await gear.fetchTextFiles({ shader: shaderName }, basePath)
        
        const shaderCode = templateFunction(shaderCodes["shader"]) // .replace(/\[\[block\]\]/g, "")  // [[block]] attribute is deprecated
        const shaderModule = new ShaderModule(this, shaderCode)

        if (await shaderModule.hasCompilationErrors()) {
            throw new Error("Module compilation failed!")
        }
    
        return shaderModule
    }
    
    encodeCommand(encoding: (encoder: CommandEncoder) => void): GPUCommandBuffer {
        const encoder = new CommandEncoder(this)
        encoding(encoder)
        return encoder.finish()
    }

    encodeCommands(...encodings: ((encoder: CommandEncoder) => void)[]): GPUCommandBuffer[] {
        return encodings.map(encoding => this.encodeCommand(encoding))
    }
    
    enqueueCommand(encoding: (encoder: CommandEncoder) => void) {
        this.enqueue(this.encodeCommand(encoding))
    }

    enqueueCommands(...encodings: ((encoder: CommandEncoder) => void)[]) {
        this.enqueue(...this.encodeCommands(...encodings))
    }
    
    enqueue(...commands: GPUCommandBuffer[]) {
        this.device.queue.submit(commands)
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

    buffer(usage: GPUBufferUsageFlags, dataOrSize: DataView | number, stride = 0): Buffer {
        return stride > 0 ? 
            new Buffer(this, usage, dataOrSize, stride) : 
            new Buffer(this, usage, dataOrSize) 
    }

    createBindGroup(bindGroupLayout: GPUBindGroupLayout, resources: (Buffer | TextureView | Sampler)[]) {
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: resources.map((resource, index) => ({
                binding: index,
                resource: resource instanceof Buffer ? { 
                    buffer: resource.buffer 
                } : resource instanceof TextureView ? 
                    resource.view :
                    resource.sampler,
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