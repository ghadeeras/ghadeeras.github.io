import { Device } from "./device.js";
import { asColorTargetState, TextureFormatSource } from "./utils.js";

export class ShaderModule {

    readonly shaderModule: GPUShaderModule
    readonly descriptor: Readonly<GPUShaderModuleDescriptor>

    constructor(label: string, readonly device: Device, code: string) {
        this.descriptor = { code, label };
        this.shaderModule = this.device.device.createShaderModule(this.descriptor)
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

    computePipeline(entryPoint: string) {
        return this.device.device.createComputePipeline({
            compute: { 
                module: this.shaderModule,
                entryPoint: entryPoint, 
            },
            layout: "auto",
            label: `${this.shaderModule.label}/${entryPoint}`
        })
    }

    vertexState(entryPoint: string, buffers: (GPUVertexBufferLayout | number)[]): GPUVertexState {
        const index = [0]
        return {
            module: this.shaderModule,
            entryPoint: entryPoint,
            buffers: buffers.map(buffer => {
                if (typeof buffer == 'number') {
                    index[0] += buffer
                    return null
                }
                return {
                    ...buffer,
                    attributes: [...buffer.attributes].map(attribute => ({
                        ...attribute,
                        shaderLocation: index[0]++ 
                    }))
                }
            })
        }
    }

    fragmentState(entryPoint: string, targets: (TextureFormatSource | null)[]): GPUFragmentState {
        return {
            module: this.shaderModule,
            entryPoint: entryPoint,
            targets: targets.map(target => target !== null 
                ? asColorTargetState(target)
                : null
            )
        }
    }

}