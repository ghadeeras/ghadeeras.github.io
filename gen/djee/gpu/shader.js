var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { asColorTargetState } from "./utils.js";
export class ShaderModule {
    constructor(label, device, code) {
        this.device = device;
        this.descriptor = { code, label };
        this.shaderModule = this.device.device.createShaderModule(this.descriptor);
        if (this.shaderModule === null) {
            throw new Error("Module compilation failed!");
        }
    }
    hasCompilationErrors() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.shaderModule.compilationInfo) {
                // TODO remove check when compilationInfo becomes supported in all browsers. 
                return false;
            }
            const info = yield this.shaderModule.compilationInfo();
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
    fullScreenPass: (shader) => `
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
            let position = select(
                vec2(varyings.clipPosition.x, varyings.clipPosition.y / aspect),
                vec2(varyings.clipPosition.x * aspect, varyings.clipPosition.y),
                aspect >= 1.0
            );
            return colorAt(position, aspect, select(pixelSizeX, pixelSizeY, aspect >= 1.0));
        }  
    `
};
//# sourceMappingURL=shader.js.map