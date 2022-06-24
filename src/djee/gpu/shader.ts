import { Device } from "./device.js";
import { formatOf, TextureFormatSource } from "./utils.js";

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
            },
            layout: "auto"
        })
    }

    vertexState(entryPoint: string, buffers: GPUVertexBufferLayout[], rewriteLocations: boolean = true): GPUVertexState {
        const index = [0]
        return {
            module: this.shaderModule,
            entryPoint: entryPoint,
            buffers: rewriteLocations ? buffers.map(buffer => ({
                ...buffer, 
                attributes: [...buffer.attributes].map(attribute => ({
                    ...attribute,
                    shaderLocation: index[0]++ 
                }))
            })) : buffers
        }
    }

    fragmentState(entryPoint: string, targets: (TextureFormatSource | null)[]): GPUFragmentState {
        return {
            module: this.shaderModule,
            entryPoint: entryPoint,
            targets: targets.map(target => target !== null 
                ? { format: formatOf(target) } 
                : null
            )
        }
    }

}