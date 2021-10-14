var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { fetchTextFiles } from "../../gear/latest/index.js";
export function createComputePipeline(device, entryPoint, module) {
    return device.createComputePipeline({
        compute: { entryPoint, module }
    });
}
export function readBuffer(device, from, to, size) {
    device.queue.submit([
        encodeCommand(device, encoder => {
            encoder.copyBufferToBuffer(from, 0, to, 0, size);
        })
    ]);
    return device.queue.onSubmittedWorkDone().then(() => {
        return to.mapAsync(GPUMapMode.READ).then(() => {
            const mappedRange = to.getMappedRange();
            const result = mappedRange.slice(0);
            to.unmap();
            return result;
        });
    });
}
export function computePass(encoder, passSetter) {
    const pass = encoder.beginComputePass();
    passSetter(pass);
    pass.endPass();
}
export function encodeCommand(device, encoding) {
    const encoder = device.createCommandEncoder();
    try {
        encoding(encoder);
    }
    finally {
        return encoder.finish();
    }
}
export function createBindGroup(device, bindGroupLayout, buffers) {
    return device.createBindGroup({
        layout: bindGroupLayout,
        entries: buffers.map((buffer, index) => ({
            binding: index,
            resource: { buffer }
        }))
    });
}
export function createF32Buffer(device, usage, bufferDataOrSize) {
    if (typeof bufferDataOrSize === 'number') {
        return device.createBuffer({
            size: bufferDataOrSize * 4,
            usage: usage
        });
    }
    else {
        const buffer = device.createBuffer({
            size: bufferDataOrSize.length * 4,
            usage: usage,
            mappedAtCreation: true
        });
        const mappedRange = new Float32Array(buffer.getMappedRange());
        mappedRange.set(bufferDataOrSize);
        buffer.unmap();
        return buffer;
    }
}
export function loadShaderModule(device, shader) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield fetchTextFiles({
            shader
        }, "/shaders");
        const shaderModule = device.createShaderModule({
            code: shaders.shader
        });
        const info = yield shaderModule.compilationInfo();
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
        if (info.messages.some(m => m.type == "error")) {
            throw new Error("Module compilation failed!");
        }
        return shaderModule;
    });
}
export function gpuDevice() {
    return __awaiter(this, void 0, void 0, function* () {
        const gpu = required(navigator.gpu);
        const adapter = required(yield gpu.requestAdapter());
        const device = required(yield adapter.requestDevice());
        return device;
    });
}
export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
//# sourceMappingURL=gpu.utils.js.map