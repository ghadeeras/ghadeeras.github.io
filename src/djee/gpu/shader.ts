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
        if (!this.shaderModule.getCompilationInfo) {
            // TODO remove check when compilationInfo becomes supported in all browsers. 
            return false
        }
        const info = await this.shaderModule.getCompilationInfo()
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

    computePipeline(entryPoint: string, layout: GPUPipelineLayout | "auto" = "auto") {
        return this.device.device.createComputePipeline({
            compute: { 
                module: this.shaderModule,
                entryPoint: entryPoint, 
            },
            layout,
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

export const renderingShaders = {
    
    fullScreenPass: (shader: string) => /*wgsl*/`
        struct Varyings {
            @builtin(position) position: vec4<f32>,
            @location(0) clipPosition: vec2<f32>,
        };
        
        const triangle: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
            vec2(-1.0, -1.0),
            vec2( 3.0, -1.0),
            vec2(-1.0,  3.0),
        );
        
        @vertex
        fn v_main(@builtin(vertex_index) i: u32) -> Varyings {
            let clipPosition: vec2<f32> = triangle[i];
            return Varyings(vec4<f32>(clipPosition, 0.0, 1.0), clipPosition);
        }
    
        ${shader}

        @fragment
        fn f_main(varyings: Varyings) -> @location(0) vec4<f32> {
            let pixelSizeX =  dpdx(varyings.clipPosition.x); 
            let pixelSizeY = -dpdy(varyings.clipPosition.y); 
            let aspect = pixelSizeY / pixelSizeX;
            let positionAndSize = select(
                vec3(varyings.clipPosition.x, varyings.clipPosition.y / aspect, pixelSizeX),
                vec3(varyings.clipPosition.x * aspect, varyings.clipPosition.y, pixelSizeY),
                aspect >= 1.0
            );
            return colorAt(positionAndSize.xy, aspect, positionAndSize.z);
        }  
    `
    
}
