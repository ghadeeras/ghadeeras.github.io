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
import { NULL } from './scene.js';
import { u32 } from '../djee/gpu/index.js';
export const uniformsStruct = gpu.struct({
    matrix: gpu.mat3x3,
    position: gpu.f32.x3,
    focalLength: gpu.f32,
    aspectRatio: gpu.f32,
    samplesPerPixel: gpu.u32,
}, ["matrix", "position", "focalLength", "aspectRatio", "samplesPerPixel"]);
export const volumeStruct = gpu.struct({
    min: gpu.f32.x3,
    max: gpu.f32.x3,
    invSize: gpu.f32.x3,
}, ["min", "max", "invSize"]);
export const faceDirectionsStruct = gpu.struct({
    lights: gpu.u32.times(4),
}, ["lights"]);
export const faceStruct = gpu.struct({
    material: u32,
    light: u32,
});
export const boxStruct = gpu.struct({
    volume: volumeStruct,
    faces: faceStruct.times(6),
}, ["volume", "faces"]);
export const boxDirectionsStruct = gpu.struct({
    faces: faceDirectionsStruct.times(6),
}, ["faces"]);
export const rectangleStruct = gpu.struct({
    position: gpu.f32.x3,
    size: gpu.f32.x2,
    face: gpu.i32,
    area: gpu.f32,
}, ["position", "size", "face", "area"]);
export const cell = gpu.u32.times(8);
export class Tracer {
    constructor(shaderModule, canvas, scene) {
        this.canvas = canvas;
        this.scene = scene;
        this._matrix = aether.mat3.identity();
        this._position = aether.vec3.of(32, 32, 32);
        this._samplesPerPixel = 1;
        this._focalLength = Math.SQRT2;
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
        this.lightsBuffer = this.createLightsBuffer();
        this.gridBuffer = this.createGridBuffer();
        this.clockBuffer = this.createClockBuffer();
        this.importantDirectionsBuffer = this.createImportantDirectionsBuffer();
        this.group = this.device.createBindGroup(this.groupLayout, [
            this.uniformsBuffer,
            this.materialsBuffer,
            this.boxesBuffer,
            this.lightsBuffer,
            this.gridBuffer,
            this.importantDirectionsBuffer,
            this.clockBuffer,
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
        return this._focalLength;
    }
    set focalRatio(f) {
        this._focalLength = f;
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
                focalLength: this._focalLength,
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
    createLightsBuffer() {
        const dataView = rectangleStruct.view(this.scene.lights);
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView);
    }
    createGridBuffer() {
        const dataView = cell.view(this.scene.grid);
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView);
    }
    createImportantDirectionsBuffer() {
        const dataView = boxDirectionsStruct.view(this.scene.boxes.length);
        for (let i = 0; i < this.scene.boxes.length; i++) {
            boxDirectionsStruct.writeOne(dataView, i, {
                faces: [{
                        lights: [NULL, NULL, NULL, NULL]
                    }, {
                        lights: [NULL, NULL, NULL, NULL]
                    }, {
                        lights: [NULL, NULL, NULL, NULL]
                    }, {
                        lights: [NULL, NULL, NULL, NULL]
                    }, {
                        lights: [NULL, NULL, NULL, NULL]
                    }, {
                        lights: [NULL, NULL, NULL, NULL]
                    }]
            });
        }
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView);
    }
    createClockBuffer() {
        const dataView = gpu.u32.view([0]);
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView);
    }
    clamp(p) {
        const min = 0.5;
        const max = this.scene.gridSize - 0.5;
        return aether.vec3.min(aether.vec3.max(p, aether.vec3.of(min, min, min)), aether.vec3.of(max, max, max));
    }
}
//# sourceMappingURL=tracer.js.map