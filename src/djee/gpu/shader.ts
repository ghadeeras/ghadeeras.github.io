import { Device } from "./device.js";
import { formatOf, TextureFormatSource } from "./types.js";

export class ShaderModule {

    readonly shaderModule: GPUShaderModule

    constructor(readonly device: Device, code: string) {
        this.shaderModule = this.device.device.createShaderModule({ code })
        if (this.shaderModule === null) {
            throw new Error("Module compilation failed!")
        }
    }

    async hasCompilationErrors() {
        if (!this.shaderModule.compilationInfo) {
            // TODO remove check when compilationInfo becomes supported in all browsers. 
            return false
        }
        const info = await this.shaderModule.compilationInfo()
        for (const message of info.messages) {
            switch (message.type) {
                case "info": console.log(message); break
                case "warning": console.warn(message); break
                case "error": console.error(message); break
                default:
            }
        }
        return info.messages.some(m => m.type == "error")
    }

    createComputePipeline(entryPoint: string) {
        return this.device.device.createComputePipeline({
            compute: { 
                module: this.shaderModule,
                entryPoint: entryPoint, 
            }
        })
    }

    fragmentState(entryPoint: string, targets: TextureFormatSource[]): GPUFragmentState {
        return {
            module: this.shaderModule,
            entryPoint: entryPoint,
            targets: targets.map(formatOf).map(format => ({ format }))
        }
    }

}