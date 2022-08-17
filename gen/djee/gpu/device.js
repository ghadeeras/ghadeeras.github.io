var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { required } from "../utils.js";
import { Buffer } from "./buffer.js";
import { Canvas } from "./canvas.js";
import { CommandEncoder } from "./encoder.js";
import { ShaderModule } from "./shader.js";
import { Texture, Sampler } from "./texture.js";
export class Device {
    constructor(device, adapter) {
        this.device = device;
        this.adapter = adapter;
    }
    loadShaderModule(shaderName, templateFunction = s => s, basePath = "/shaders") {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(`${basePath}/${shaderName}`, { method: "get", mode: "no-cors" });
            const rawShaderCode = yield response.text();
            return yield this.shaderModule(shaderName, rawShaderCode, templateFunction);
        });
    }
    shaderModule(shaderName, rawShaderCode, templateFunction = s => s) {
        return __awaiter(this, void 0, void 0, function* () {
            const shaderCode = templateFunction(rawShaderCode);
            const shaderModule = new ShaderModule(shaderName, this, shaderCode);
            if (yield shaderModule.hasCompilationErrors()) {
                throw new Error("Module compilation failed!");
            }
            return shaderModule;
        });
    }
    enqueueCommands(name, ...encodings) {
        this.enqueue(...this.commands(name, ...encodings));
    }
    enqueueCommand(name, encoding) {
        this.enqueue(this.command(name, encoding));
    }
    enqueue(...commands) {
        this.device.queue.submit(commands);
    }
    commands(name, ...encodings) {
        return encodings.map((encoding, i) => this.command(`${name}#${i}`, encoding));
    }
    command(name, encoding) {
        const encoder = new CommandEncoder(name, this);
        encoding(encoder);
        return encoder.finish();
    }
    canvas(element, withMultiSampling = true) {
        return new Canvas(this, element, withMultiSampling);
    }
    texture(descriptor) {
        return new Texture(this, descriptor);
    }
    sampler(descriptor = undefined) {
        return new Sampler(this, descriptor);
    }
    buffer(label, usage, dataOrSize, stride = 0) {
        return stride > 0 ?
            new Buffer(label, this, usage, dataOrSize, stride) :
            new Buffer(label, this, usage, dataOrSize);
    }
    bindGroup(bindGroupLayout, resources) {
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: resources.map((resource, index) => ({
                binding: index,
                resource: resource,
            }))
        });
    }
    monitorErrors(filter, expression) {
        return __awaiter(this, void 0, void 0, function* () {
            this.device.pushErrorScope(filter);
            const result = expression();
            const error = yield this.device.popErrorScope();
            if (error) {
                throw error;
            }
            return result;
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