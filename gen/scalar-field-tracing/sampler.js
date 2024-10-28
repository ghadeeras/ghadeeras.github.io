var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from "../djee/gpu/index.js";
import { aether } from "../libs.js";
export class FieldSampler {
    constructor(shader) {
        this.shader = shader;
        const device = shader.device;
        this.pipeline = shader.computePipeline("c_main");
        const fieldComputeBidGroupLayout = this.pipeline.getBindGroupLayout(0);
        this.fieldTexture = device.texture({
            label: "scalar-field",
            format: "rgba16float",
            dimension: "3d",
            size: {
                width: FieldSampler.SIZE,
                height: FieldSampler.SIZE,
                depthOrArrayLayers: FieldSampler.SIZE
            },
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        });
        this.uniformsBuffer = device.syncBuffer("uniforms-buffer", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, FieldSampler.uniformsStruct.view([{
                matrix: aether.mat3.rotation(Math.PI / Math.SQRT2, [1, 2, 3]),
                displacement: aether.vec3.of(Math.sqrt(1 / 2), Math.sqrt(1 / 3), Math.sqrt(1 / 5)),
                scale: Math.SQRT1_2,
                depth: 5
            }]));
        this.bindGroup = device.bindGroup(fieldComputeBidGroupLayout, [this.fieldTexture.createView(), this.uniformsBuffer]);
    }
    get matrix() {
        return this.uniformsBuffer.get(FieldSampler.uniformsStruct.members.matrix);
    }
    set matrix(m) {
        this.uniformsBuffer.set(FieldSampler.uniformsStruct.members.matrix, m);
    }
    get depth() {
        return this.uniformsBuffer.get(FieldSampler.uniformsStruct.members.depth);
    }
    set depth(d) {
        if (d >= 0 && d <= 9) {
            this.uniformsBuffer.set(FieldSampler.uniformsStruct.members.depth, d);
        }
    }
    get scale() {
        return this.uniformsBuffer.get(FieldSampler.uniformsStruct.members.scale);
    }
    set scale(s) {
        if (s >= Math.SQRT1_2 && s <= Math.SQRT2) {
            this.uniformsBuffer.set(FieldSampler.uniformsStruct.members.scale, s);
        }
    }
    sample() {
        const device = this.shader.device;
        device.enqueueCommand("field-sampler-command", encoder => {
            encoder.computePass(pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, this.bindGroup);
                pass.dispatchWorkgroups(FieldSampler.SIZE / 4, FieldSampler.SIZE / 4, FieldSampler.SIZE / 4);
            });
        });
    }
    static create(device) {
        return __awaiter(this, void 0, void 0, function* () {
            const shader = yield device.loadShaderModule("field-sampler.wgsl");
            return new FieldSampler(shader);
        });
    }
}
FieldSampler.uniformsStruct = gpu.struct({
    matrix: gpu.mat3x3,
    displacement: gpu.f32.x3,
    scale: gpu.f32,
    depth: gpu.u32,
});
FieldSampler.SIZE = 128;
//# sourceMappingURL=sampler.js.map