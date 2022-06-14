var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as aether from '/aether/latest/index.js';
import * as gpu from "../djee/gpu/index.js";
export const uniformsStruct = gpu.struct({
    matrix: gpu.mat3x3,
    position: gpu.f32.x3,
    randomSeed: gpu.u32.x4,
    focalLength: gpu.f32,
    aspectRatio: gpu.f32,
    samplesPerPixel: gpu.u32,
}, ["matrix", "position", "randomSeed", "focalLength", "aspectRatio", "samplesPerPixel"]);
export const volumeStruct = gpu.struct({
    min: gpu.f32.x3,
    max: gpu.f32.x3,
    invSize: gpu.f32.x3,
}, ["min", "max", "invSize"]);
export const faceStruct = gpu.struct({
    lights: gpu.u32.x4,
    material: gpu.u32,
}, ["lights", "material"]);
export const boxStruct = gpu.struct({
    volume: volumeStruct,
    faceMaterials: gpu.u32.times(6),
}, ["volume", "faceMaterials"]);
export const cell = gpu.u32.times(8);
const SEEDS_COUNT = 0x4000;
export class Tracer {
    constructor(shaderModule, canvas, scene) {
        this.canvas = canvas;
        this.scene = scene;
        this._matrix = aether.mat3.identity();
        this._position = aether.vec3.of(32, 32, 32);
        this._samplesPerPixel = 16;
        this._focalRation = Math.SQRT2;
        this.device = shaderModule.device;
        this.pipeline = this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                canvas
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            }
        });
        this.groupLayout = this.pipeline.getBindGroupLayout(0);
        this.uniformsBuffer = this.createUniformsBuffer();
        this.materialsBuffer = this.createMaterialsBuffer();
        this.boxesBuffer = this.createBoxesBuffer();
        this.gridBuffer = this.createGridBuffer();
        this.rngSeedsBuffer = this.createRNGSeedsBuffer();
        this.group = this.device.createBindGroup(this.groupLayout, [
            this.uniformsBuffer,
            this.materialsBuffer,
            this.boxesBuffer,
            this.gridBuffer
        ]);
    }
    static create(device, canvas, scene) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Tracer(yield device.loadShaderModule("path-tracing.wgsl"), canvas, scene);
        });
    }
    encode(encoder, colorAttachment) {
        encoder.renderPass({ colorAttachments: [colorAttachment] }, pass => {
            pass.setBindGroup(0, this.group);
            pass.setPipeline(this.pipeline);
            pass.draw(4);
        });
        const seed = uniformsStruct.members.randomSeed;
        this.uniformsBuffer.copyingAt(seed.x.offset, this.rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoder);
        this.uniformsBuffer.copyingAt(seed.y.offset, this.rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoder);
        this.uniformsBuffer.copyingAt(seed.z.offset, this.rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoder);
        this.uniformsBuffer.copyingAt(seed.w.offset, this.rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoder);
    }
    get matrix() {
        return this._matrix;
    }
    set matrix(m) {
        this._matrix = m;
        const v = gpu.mat3x3.view([m]);
        this.uniformsBuffer.writeAt(uniformsStruct.members.matrix.offset, v);
    }
    get position() {
        return this._position;
    }
    set position(p) {
        const position = this.clamp(p);
        this._position = position;
        const v = gpu.f32.x3.view([position]);
        this.uniformsBuffer.writeAt(uniformsStruct.members.position.offset, v);
    }
    get samplesPerPixel() {
        return this._samplesPerPixel;
    }
    set samplesPerPixel(spp) {
        this._samplesPerPixel = spp;
        const v = gpu.u32.view([spp]);
        this.uniformsBuffer.writeAt(uniformsStruct.members.samplesPerPixel.offset, v);
    }
    get focalRatio() {
        return this._focalRation;
    }
    set focalRatio(f) {
        this._focalRation = f;
        const v = gpu.f32.view([f]);
        this.uniformsBuffer.writeAt(uniformsStruct.members.focalLength.offset, v);
    }
    createUniformsBuffer() {
        var _a;
        const width = this.canvas.size.width;
        const height = (_a = this.canvas.size.height) !== null && _a !== void 0 ? _a : this.canvas.size.width;
        const dataView = uniformsStruct.view([{
                matrix: this._matrix,
                position: this._position,
                randomSeed: [random(), random(), random(), random()],
                focalLength: this._focalRation,
                aspectRatio: width / height,
                samplesPerPixel: this._samplesPerPixel,
            }]);
        return this.canvas.device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, dataView);
    }
    createMaterialsBuffer() {
        const dataView = gpu.f32.x4.view(this.scene.materials);
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView);
    }
    createBoxesBuffer() {
        const dataView = boxStruct.view(this.scene.boxes);
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView);
    }
    createGridBuffer() {
        const dataView = cell.view(this.scene.grid);
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView);
    }
    createRNGSeedsBuffer() {
        const seeds = [];
        for (let i = 0; i < SEEDS_COUNT; i++) {
            seeds.push(random());
        }
        const dataView = gpu.u32.view(seeds);
        return this.device.buffer(GPUBufferUsage.COPY_SRC, dataView);
    }
    clamp(p) {
        const min = 0.5;
        const max = this.scene.gridSize - 0.5;
        return aether.vec3.min(aether.vec3.max(p, aether.vec3.of(min, min, min)), aether.vec3.of(max, max, max));
    }
}
function randomSeedOffset() {
    return Math.floor(Math.random() * SEEDS_COUNT) * Uint32Array.BYTES_PER_ELEMENT;
}
function random() {
    return Math.round(Math.random() * 0xFFFFFFFF) | 1;
}
//# sourceMappingURL=tracer.js.map