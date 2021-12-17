import { fetchTextFiles } from "gear"
import { required } from "../../utils/misc.js"
import { Buffer } from "./buffer.js"
import { Canvas } from "./canvas.js"
import { CommandEncoder } from "./encoder.js"
import { ShaderModule } from "./shader.js"
import { Texture } from "./texture.js"

export class Device {

    constructor(readonly device: GPUDevice, readonly adapter: GPUAdapter) {
    }

    async loadShaderModule(shaderName: string, basePath: string = "/shaders"): Promise<ShaderModule> {
        const shaderCodes = await fetchTextFiles({ shader: shaderName }, basePath)
        
        const shaderModule = new ShaderModule(this, shaderCodes["shader"])
    
        if (await shaderModule.hasCompilationErrors()) {
            throw new Error("Module compilation failed!")
        }
    
        return shaderModule
    }
    
    encodeCommand(encoding: (encoder: CommandEncoder) => void): GPUCommandBuffer {
        const encoder = new CommandEncoder(this)
        try {
            encoding(encoder)
        } finally {
            return encoder.finish()
        }
    }

    enqueueCommand(encoding: (encoder: CommandEncoder) => void) {
        this.enqueue(this.encodeCommand(encoding))
    }

    enqueueCommands(...encodings: ((encoder: CommandEncoder) => void)[]) {
        this.enqueue(...encodings.map(encoding => this.encodeCommand(encoding)))
    }
    
    enqueue(...commands: GPUCommandBuffer[]) {
        this.device.queue.submit(commands)
    }
    
    canvas(element: HTMLCanvasElement | string): Canvas {
        return new Canvas(this, element)
    }

    texture(descriptor: GPUTextureDescriptor): Texture {
        return new Texture(this, descriptor)
    }

    buffer(usage: GPUBufferUsageFlags, dataOrSize: DataView | number, stride: number = 0): Buffer {
        return stride > 0 ? 
            new Buffer(this, usage, dataOrSize, stride) : 
            new Buffer(this, usage, dataOrSize) 
    }

    createBindGroup(bindGroupLayout: GPUBindGroupLayout, buffers: Buffer[]) {
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: buffers.map((buffer, index) => ({
                binding: index,
                resource: { 
                    buffer: buffer.buffer 
                },
            }))
        })
    }
    
    async monitorErrors<T>(filter: GPUErrorFilter, expression: () => T): Promise<T> {
        this.device.pushErrorScope(filter)
        try {
            return expression()
        } finally {
            const error = await this.device.popErrorScope()
            if (error !== null) {
                throw error
            }
        }
    }    

    static async instance(): Promise<Device> {
        const gpu = required(navigator.gpu)
        const adapter = required(await gpu.requestAdapter())
        const device = required(await adapter.requestDevice())
        return new Device(device, adapter)
    }

}