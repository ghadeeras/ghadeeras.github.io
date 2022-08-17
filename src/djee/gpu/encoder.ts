import { Device } from "./device.js"

export class CommandEncoder {

    readonly encoder: GPUCommandEncoder
    readonly descriptor: Readonly<GPUCommandEncoderDescriptor>

    constructor(label: string, readonly device: Device) {
        this.descriptor = { label }
        this.encoder = this.device.device.createCommandEncoder(this.descriptor)
    }

    finish(): GPUCommandBuffer {
        return this.encoder.finish()
    }

    computePass<T>(passSetter: (pass: GPUComputePassEncoder) => T): T {
        const pass = this.encoder.beginComputePass()
        try {
            return passSetter(pass)
        } finally {
            pass.end()
        }
    }
    
    renderPass<T>(descriptor: GPURenderPassDescriptor, passSetter: (pass: GPURenderPassEncoder) => T): T {
        const pass = this.encoder.beginRenderPass(descriptor)
        try {
            return passSetter(pass)
        } finally {
            pass.end()
        }
    }
    
}