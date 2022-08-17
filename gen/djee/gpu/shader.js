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
    computePipeline(entryPoint) {
        return this.device.device.createComputePipeline({
            compute: {
                module: this.shaderModule,
                entryPoint: entryPoint,
            },
            layout: "auto",
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
//# sourceMappingURL=shader.js.map