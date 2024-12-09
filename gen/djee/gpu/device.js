import { required, timeOut } from "../utils.js";
import { BindGroupLayout } from "./group.js";
import { Buffer, SyncBuffer } from "./buffer.js";
import { Canvas } from "./canvas.js";
import { CommandEncoder } from "./encoder.js";
import { ShaderModule } from "./shader.js";
import { Texture, Sampler } from "./texture.js";
import { PipelineLayout } from "./pipeline.js";
import { GPUObject } from "./meta.js";
export class Device extends GPUObject {
    constructor(device, adapter) {
        super();
        this.device = device;
        this.adapter = adapter;
    }
    async loadShaderModule(relativePath, templateFunction = s => s, basePath = "/shaders") {
        return await this.labeledShaderModule(relativePath, relativePath, templateFunction, basePath);
    }
    async labeledShaderModule(label, relativePath, templateFunction = s => s, basePath = "/shaders") {
        const response = await fetch(`${basePath}/${relativePath}`, { method: "get", mode: "no-cors" });
        const rawShaderCode = await response.text();
        return await this.shaderModule(label, rawShaderCode, templateFunction);
    }
    async shaderModule(label, rawShaderCode, templateFunction = s => s) {
        const shaderCode = templateFunction(rawShaderCode);
        const shaderModule = new ShaderModule(label, this, shaderCode);
        if (await shaderModule.hasCompilationErrors()) {
            throw new Error("Module compilation failed!");
        }
        return shaderModule;
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
    async pipelineLayout(label, entries) {
        return await PipelineLayout.create(this, label, { bindGroupLayouts: entries });
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
    suggestedGroupSizes() {
        const limits = this.device.limits;
        const wgs = Math.max(limits.maxComputeWorkgroupSizeX, limits.maxComputeWorkgroupSizeY, limits.maxComputeWorkgroupSizeZ);
        const bitCount1D = Math.floor(Math.log2(wgs));
        const bitCount2DY = bitCount1D >>> 1;
        const bitCount2DX = bitCount1D - bitCount2DY;
        const bitCount3DZ = Math.floor(bitCount1D / 3);
        const bitCount3DY = (bitCount1D - bitCount3DZ) >>> 1;
        const bitCount3DX = bitCount1D - bitCount2DY - bitCount3DZ;
        const oneD = 1 << bitCount1D;
        const twoDX = 1 << bitCount2DX;
        const twoDY = 1 << bitCount2DY;
        const threeDX = 1 << bitCount3DX;
        const threeDY = 1 << bitCount3DY;
        const threeDZ = 1 << bitCount3DZ;
        return [
            [oneD],
            [twoDX, twoDY],
            [threeDX, threeDY, threeDZ]
        ];
    }
    async monitorErrors(filter, expression) {
        this.device.pushErrorScope(filter);
        const result = expression();
        const error = await this.device.popErrorScope();
        if (error) {
            throw error;
        }
        return result;
    }
    static async instance() {
        const gpu = required(navigator.gpu);
        const adapter = required(await timeOut(gpu.requestAdapter(), 5000, "GPU Adapter"));
        const device = required(await timeOut(adapter.requestDevice(), 5000, "GPU Device"));
        return new Device(device, adapter);
    }
}
//# sourceMappingURL=device.js.map