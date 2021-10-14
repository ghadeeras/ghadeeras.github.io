import { fetchTextFiles } from "../../../gear/latest/index.js"

export type TypedArray = 
    Float32Array |
    Int32Array |
    Int16Array |
    Int8Array |
    Uint32Array |
    Uint16Array |
    Uint8Array

export function createBuffer(device: GPUDevice, usage: GPUBufferUsageFlags, bufferDataOrSize: TypedArray | number) {
    if (typeof bufferDataOrSize === 'number') {
        return device.createBuffer({
            size:  bufferDataOrSize,
            usage: usage,
        })
    } else {
        const buffer = device.createBuffer({
            size: bufferDataOrSize.byteLength,
            usage: usage,
            mappedAtCreation: true,
        })
        const mappedRange = new Uint8Array(buffer.getMappedRange())
        mappedRange.set(new Uint8Array(bufferDataOrSize.buffer))
        buffer.unmap()
        return buffer
    }
}

export function copyBuffer(device: GPUDevice, from: GPUBuffer, fromOffset: number, to: GPUBuffer, toOffset: number, size: number) {
    device.queue.submit([
        encodeCommand(device, encoder => {
            encoder.copyBufferToBuffer(from, fromOffset, to, toOffset, size)
        })
    ])
}

export async function readMapReadBuffer(device: GPUDevice, temp: GPUBuffer) {
    return await device.queue.onSubmittedWorkDone().then(() => {
        return temp.mapAsync(GPUMapMode.READ).then(() => {
            const mappedRange = temp.getMappedRange()
            const result = mappedRange.slice(0)
            temp.unmap()
            return result
        })
    })
}

export async function readCopySrcBuffer(device: GPUDevice, buffer: GPUBuffer, size: number, offset: number = 0) {
    const temp = createBuffer(device, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, size)
    try {
        copyBuffer(device, buffer, offset, temp, 0, size)
        return await readMapReadBuffer(device, temp)
    } finally {
        temp.destroy()
    }
}

export function encodeCommand(device: GPUDevice, encoding: (encoder: GPUCommandEncoder) => void): GPUCommandBuffer {
    const encoder = device.createCommandEncoder()
    try {
        encoding(encoder)
    } finally {
        return encoder.finish()
    }
}

export function computePass(encoder: GPUCommandEncoder, passSetter: (pass: GPUComputePassEncoder) => void): void {
    const pass = encoder.beginComputePass()
    passSetter(pass)
    pass.endPass()
}

export function renderPass(encoder: GPUCommandEncoder, descriptor: GPURenderPassDescriptor, passSetter: (pass: GPURenderPassEncoder) => void): void {
    const pass = encoder.beginRenderPass(descriptor)
    passSetter(pass)
    pass.endPass()
}

export function depthAttachment(depthTexture: GPUTexture): GPURenderPassDepthStencilAttachment {
    return {
        view: depthTexture.createView(),
        depthLoadValue: 1,
        depthStoreOp: "discard",
        stencilStoreOp: "discard",
        stencilLoadValue: "load",
    }
}

export function createBindGroup(device: GPUDevice, bindGroupLayout: GPUBindGroupLayout, buffers: GPUBuffer[]) {
    return device.createBindGroup({
        layout: bindGroupLayout,
        entries: buffers.map((buffer, index) => ({
            binding: index,
            resource: { buffer },
        }))
    })
}

export function createComputePipeline(device: GPUDevice, entryPoint: string, module: GPUShaderModule) {
    return device.createComputePipeline({
        compute: { entryPoint, module }
    })
}

export async function loadShaderModule<K extends string>(device: GPUDevice, shaderName: string): Promise<GPUShaderModule> {
    const shaderCodes = await fetchTextFiles({ shader: shaderName }, "/shaders")
    
    const shaderModule = device.createShaderModule({
        code: shaderCodes["shader"]
    })

    const info = await shaderModule.compilationInfo()
    for (const message of info.messages) {
        switch (message.type) {
            case "info": console.log(message); break
            case "warning": console.warn(message); break
            case "error": console.error(message); break
            default:
        }
    }

    if (info.messages.some(m => m.type == "error")) {
        throw new Error("Module compilation failed!")
    }

    return shaderModule
}

export async function gpuObjects(): Promise<[GPUDevice, GPUAdapter]> {
    const gpu = required(navigator.gpu)
    const adapter = required(await gpu.requestAdapter())
    const device = required(await adapter.requestDevice())
    return [device, adapter]
}

export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}
