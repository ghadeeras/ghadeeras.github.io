import { Device } from "./device.js";
import { Definition, GPUObject } from "./meta.js";
import { asColorTargetState, TextureFormatSource, CaseObject } from "./utils.js";

export type ShaderModuleCode = 
      CaseObject<"path" | "code", "path", string>
    | CaseObject<"path" | "code", "code", string>

export type ShaderModuleDescriptor = ShaderModuleCode & {
    compilationHints?: Array<GPUShaderModuleCompilationHint>;
    templateFunction?: (code: string) => string
}

export class ShaderModule extends GPUObject {

    readonly shaderModule: GPUShaderModule
    readonly descriptor: Readonly<GPUShaderModuleDescriptor>

    constructor(label: string, readonly device: Device, code: string) {
        super()
        this.descriptor = { code, label };
        this.shaderModule = this.device.device.createShaderModule(this.descriptor)
        if (this.shaderModule === null) {
            throw new Error("Module compilation failed!")
        }
    }

    static from(descriptor: ShaderModuleDescriptor) {
        return new Definition((device, label) => ShaderModule.create(descriptor, device, label))
    }

    static async create(descriptor: ShaderModuleDescriptor, device: Device, label: string): Promise<ShaderModule> {
        return descriptor.path !== undefined
            ? await device.labeledShaderModule(label, descriptor.path, descriptor.templateFunction)
            : await device.shaderModule(label, descriptor.code, descriptor.templateFunction);
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
    
    fullScreenPassVertex: (fragmentShader: string) => /*wgsl*/`
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
    
        ${fragmentShader}
    `,
    
    fullScreenPass: (shader: string) => renderingShaders.fullScreenPassVertex(/*wgsl*/`
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
    `)
    
}

export type AppShaders<S extends AppShadersRecord> = {
    [k in keyof S]: ShaderModule
}

export type AppShadersRecord = Record<string, AppShaderRecord>

export type AppShaderRecord = {
    path: string, code?: never
} | {
    code: string, path?: never
}

export class AppShadersBuilder {

    constructor(private label: string) {}

    withShaders<S extends AppShadersRecord>(shaders: S): AppShadersBuilderWithShaders<S> {
        return new AppShadersBuilderWithShaders<S>(this.label, shaders)
    }

}

export class AppShadersBuilderWithShaders<S extends AppShadersRecord> {

    constructor(private label: string, private shaders: S) {}

    async build(device: Device, rootPath: string = ".", processor: (code: string, path?: string | null) => string = code => code): Promise<AppShaders<S>> {
        const result: Partial<AppShaders<S>> = {}
        for (const k of Object.keys(this.shaders)) {
            const shader = this.shaders[k]
            const label = `${this.label}.shaders.${k}`
            const templateFunction = (code: string) => processor(code, rootPath)
            result[k as keyof S] = await (typeof shader.path == 'string' 
                ? device.labeledShaderModule(label, shader.path, templateFunction, rootPath)
                : device.shaderModule(label, shader.code, templateFunction)
            )
        }
        return result as AppShaders<S>
    }

}

export function appShadersBuilder(label: string): AppShadersBuilder {
    return new AppShadersBuilder(label)
}