var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Definition, GPUObject } from "./meta.js";
import { asColorTargetState } from "./utils.js";
export class ShaderModule extends GPUObject {
    constructor(label, device, code) {
        super();
        this.device = device;
        this.descriptor = { code, label };
        this.shaderModule = this.device.device.createShaderModule(this.descriptor);
        if (this.shaderModule === null) {
            throw new Error("Module compilation failed!");
        }
    }
    static from(descriptor) {
        return new Definition((device, label) => ShaderModule.create(descriptor, device, label));
    }
    static create(descriptor, device, label) {
        return __awaiter(this, void 0, void 0, function* () {
            return descriptor.path !== undefined
                ? yield device.labeledShaderModule(label, descriptor.path, descriptor.templateFunction)
                : yield device.shaderModule(label, descriptor.code, descriptor.templateFunction);
        });
    }
    hasCompilationErrors() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.shaderModule.getCompilationInfo) {
                // TODO remove check when compilationInfo becomes supported in all browsers. 
                return false;
            }
            const info = yield this.shaderModule.getCompilationInfo();
            for (const message of info.messages) {
                switch (message.type) {
                    case "info":
                        console.log(message);
                        break;
                    case "warning":
                        console.warn(message);
                        break;
                    case "error":
                        console.error(message);
                        break;
                    default:
                }
            }
            return info.messages.some(m => m.type == "error");
        });
    }
    computePipeline(entryPoint, layout = "auto") {
        return this.device.device.createComputePipeline({
            compute: {
                module: this.shaderModule,
                entryPoint: entryPoint,
            },
            layout,
            label: `${this.shaderModule.label}/${entryPoint}`
        });
    }
    vertexState(entryPoint, buffers) {
        const index = [0];
        return {
            module: this.shaderModule,
            entryPoint: entryPoint,
            buffers: buffers.map(buffer => {
                if (typeof buffer == 'number') {
                    index[0] += buffer;
                    return null;
                }
                return Object.assign(Object.assign({}, buffer), { attributes: [...buffer.attributes].map(attribute => (Object.assign(Object.assign({}, attribute), { shaderLocation: index[0]++ }))) });
            })
        };
    }
    fragmentState(entryPoint, targets) {
        return {
            module: this.shaderModule,
            entryPoint: entryPoint,
            targets: targets.map(target => target !== null
                ? asColorTargetState(target)
                : null)
        };
    }
}
export const renderingShaders = {
    fullScreenPassVertex: (fragmentShader) => /*wgsl*/ `
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
    fullScreenPass: (shader) => renderingShaders.fullScreenPassVertex(/*wgsl*/ `
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
};
export class AppShadersBuilder {
    constructor(label) {
        this.label = label;
    }
    withShaders(shaders) {
        return new AppShadersBuilderWithShaders(this.label, shaders);
    }
}
export class AppShadersBuilderWithShaders {
    constructor(label, shaders) {
        this.label = label;
        this.shaders = shaders;
    }
    build(device_1) {
        return __awaiter(this, arguments, void 0, function* (device, rootPath = ".", processor = code => code) {
            const result = {};
            for (const k of Object.keys(this.shaders)) {
                const shader = this.shaders[k];
                const label = `${this.label}.shaders.${k}`;
                const templateFunction = (code) => processor(code, rootPath);
                result[k] = yield (typeof shader.path == 'string'
                    ? device.labeledShaderModule(label, shader.path, templateFunction, rootPath)
                    : device.shaderModule(label, shader.code, templateFunction));
            }
            return result;
        });
    }
}
export function appShadersBuilder(label) {
    return new AppShadersBuilder(label);
}
//# sourceMappingURL=shader.js.map