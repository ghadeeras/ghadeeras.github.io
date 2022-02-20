import { Device } from "./device.js"

export class CommandEncoder {

    readonly encoder: GPUCommandEncoder

    constructor(readonly device: Device) {
        this.encoder = this.device.device.createCommandEncoder()
    }

    finish(): GPUCommandBuffer {
        return this.encoder.finish()
    }

    computePass<T>(passSetter: (pass: GPUComputePassEncoder) => T): T {
        const pass = this.encoder.beginComputePass()
        try {
            return passSetter(pass)
        } finally {
            pass.endPass()
        }
    }
    
    renderPass<T>(descriptor: GPURenderPassDescriptor, passSetter: (pass: GPURenderPassEncoder) => T): T {
        const pass = this.encoder.beginRenderPass(descriptor)
        try {
            return passSetter(pass)
        } finally {
            pass.endPass()
        }
    }
    
}