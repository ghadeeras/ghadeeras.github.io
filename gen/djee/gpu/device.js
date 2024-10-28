var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { required, timeOut } from "../utils.js";
import { BindGroupLayout } from "./group.js";
import { Buffer, SyncBuffer } from "./buffer.js";
import { Canvas } from "./canvas.js";
import { CommandEncoder } from "./encoder.js";
import { ShaderModule } from "./shader.js";
import { Texture, Sampler } from "./texture.js";
import { PipelineLayout } from "./pipeline.js";
export class Device {
    constructor(device, adapter) {
        this.device = device;
        this.adapter = adapter;
    }
    loadShaderModule(relativePath_1) {
        return __awaiter(this, arguments, void 0, function* (relativePath, templateFunction = s => s, basePath = "/shaders") {
            return yield this.labeledShaderModule(relativePath, relativePath, templateFunction, basePath);
        });
    }
    labeledShaderModule(label_1, relativePath_1) {
        return __awaiter(this, arguments, void 0, function* (label, relativePath, templateFunction = s => s, basePath = "/shaders") {
            const response = yield fetch(`${basePath}/${relativePath}`, { method: "get", mode: "no-cors" });
            const rawShaderCode = yield response.text();
            return yield this.shaderModule(label, rawShaderCode, templateFunction);
        });
    }
    shaderModule(label_1, rawShaderCode_1) {
        return __awaiter(this, arguments, void 0, function* (label, rawShaderCode, templateFunction = s => s) {
            const shaderCode = templateFunction(rawShaderCode);
            const shaderModule = new ShaderModule(label, this, shaderCode);
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
    canvas(element, sampleCount = 1) {
        return new Canvas(this, element, sampleCount);
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
    syncBuffer(label, usage, dataOrSize, stride = 0) {
        return stride > 0 ?
            SyncBuffer.create(label, this, usage, dataOrSize, stride) :
            SyncBuffer.create(label, this, usage, dataOrSize);
    }
    groupLayout(label, entries) {
        return new BindGroupLayout(label, this, entries);
    }
    pipelineLayout(label, entries) {
        return new PipelineLayout(label, this, entries);
    }
    bindGroup(bindGroupLayout, resources) {
        const discriminator = "asBindingResource";
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: resources.map((resource, index) => ({
                binding: index,
                resource: discriminator in resource ? resource.asBindingResource() : resource,
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
            const adapter = required(yield timeOut(gpu.requestAdapter(), 5000, "GPU Adapter"));
            const device = required(yield timeOut(adapter.requestDevice(), 5000, "GPU Device"));
            return new Device(device, adapter);
        });
    }
}
//# sourceMappingURL=device.js.map