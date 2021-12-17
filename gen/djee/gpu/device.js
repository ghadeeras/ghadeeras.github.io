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
import { required } from "../../utils/misc.js";
import { Buffer } from "./buffer.js";
import { Canvas } from "./canvas.js";
import { CommandEncoder } from "./encoder.js";
import { ShaderModule } from "./shader.js";
import { Texture } from "./texture.js";
export class Device {
    constructor(device, adapter) {
        this.device = device;
        this.adapter = adapter;
    }
    loadShaderModule(shaderName, basePath = "/shaders") {
        return __awaiter(this, void 0, void 0, function* () {
            const shaderCodes = yield fetchTextFiles({ shader: shaderName }, basePath);
            const shaderModule = new ShaderModule(this, shaderCodes["shader"]);
            if (yield shaderModule.hasCompilationErrors()) {
                throw new Error("Module compilation failed!");
            }
            return shaderModule;
        });
    }
    encodeCommand(encoding) {
        const encoder = new CommandEncoder(this);
        try {
            encoding(encoder);
        }
        finally {
            return encoder.finish();
        }
    }
    enqueueCommand(encoding) {
        this.enqueue(this.encodeCommand(encoding));
    }
    enqueueCommands(...encodings) {
        this.enqueue(...encodings.map(encoding => this.encodeCommand(encoding)));
    }
    enqueue(...commands) {
        this.device.queue.submit(commands);
    }
    canvas(element) {
        return new Canvas(this, element);
    }
    texture(descriptor) {
        return new Texture(this, descriptor);
    }
    buffer(usage, dataOrSize, stride = 0) {
        return stride > 0 ?
            new Buffer(this, usage, dataOrSize, stride) :
            new Buffer(this, usage, dataOrSize);
    }
    createBindGroup(bindGroupLayout, buffers) {
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: buffers.map((buffer, index) => ({
                binding: index,
                resource: {
                    buffer: buffer.buffer
                },
            }))
        });
    }
    monitorErrors(filter, expression) {
        return __awaiter(this, void 0, void 0, function* () {
            this.device.pushErrorScope(filter);
            try {
                return expression();
            }
            finally {
                const error = yield this.device.popErrorScope();
                if (error !== null) {
                    throw error;
                }
            }
        });
    }
    static instance() {
        return __awaiter(this, void 0, void 0, function* () {
            const gpu = required(navigator.gpu);
            const adapter = required(yield gpu.requestAdapter());
            const device = required(yield adapter.requestDevice());
            return new Device(device, adapter);
        });
    }
}
//# sourceMappingURL=device.js.map