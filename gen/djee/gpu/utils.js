var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { fetchTextFiles } from "../../../gear/latest/index.js";
export function createBuffer(device, usage, bufferDataOrSize) {
    if (typeof bufferDataOrSize === 'number') {
        return device.createBuffer({
            size: bufferDataOrSize,
            usage: usage,
        });
    }
    else {
        const buffer = device.createBuffer({
            size: bufferDataOrSize.byteLength,
            usage: usage,
            mappedAtCreation: true,
        });
        const mappedRange = new Uint8Array(buffer.getMappedRange());
        mappedRange.set(new Uint8Array(bufferDataOrSize.buffer));
        buffer.unmap();
        return buffer;
    }
}
export function copyBuffer(device, from, fromOffset, to, toOffset, size) {
    device.queue.submit([
        encodeCommand(device, encoder => {
            encoder.copyBufferToBuffer(from, fromOffset, to, toOffset, size);
        })
    ]);
}
export function readMapReadBuffer(device, temp) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield device.queue.onSubmittedWorkDone().then(() => {
            return temp.mapAsync(GPUMapMode.READ).then(() => {
                const mappedRange = temp.getMappedRange();
                const result = mappedRange.slice(0);
                temp.unmap();
                return result;
            });
        });
    });
}
export function readCopySrcBuffer(device, buffer, size, offset = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        const temp = createBuffer(device, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, size);
        try {
            copyBuffer(device, buffer, offset, temp, 0, size);
            return yield readMapReadBuffer(device, temp);
        }
        finally {
            temp.destroy();
        }
    });
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
export function computePass(encoder, passSetter) {
    const pass = encoder.beginComputePass();
    passSetter(pass);
    pass.endPass();
}
export function renderPass(encoder, descriptor, passSetter) {
    const pass = encoder.beginRenderPass(descriptor);
    passSetter(pass);
    pass.endPass();
}
export function depthAttachment(depthTexture) {
    return {
        view: depthTexture.createView(),
        depthLoadValue: 1,
        depthStoreOp: "discard",
        stencilStoreOp: "discard",
        stencilLoadValue: "load",
    };
}
export function createBindGroup(device, bindGroupLayout, buffers) {
    return device.createBindGroup({
        layout: bindGroupLayout,
        entries: buffers.map((buffer, index) => ({
            binding: index,
            resource: { buffer },
        }))
    });
}
export function createComputePipeline(device, entryPoint, module) {
    return device.createComputePipeline({
        compute: { entryPoint, module }
    });
}
export function loadShaderModule(device, shaderName) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaderCodes = yield fetchTextFiles({ shader: shaderName }, "/shaders");
        const shaderModule = device.createShaderModule({
            code: shaderCodes["shader"]
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
export function gpuObjects() {
    return __awaiter(this, void 0, void 0, function* () {
        const gpu = required(navigator.gpu);
        const adapter = required(yield gpu.requestAdapter());
        const device = required(yield adapter.requestDevice());
        return [device, adapter];
    });
}
export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
//# sourceMappingURL=utils.js.map