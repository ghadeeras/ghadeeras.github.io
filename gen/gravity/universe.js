var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from '../djee/gpu/index.js';
export class Universe {
    constructor(device, workgroupSize, computeShader) {
        this.device = device;
        this.workgroupSize = workgroupSize;
        this.bodiesCount = 16384;
        this.uniformsStruct = gpu.struct({
            bodyPointedness: gpu.f32,
            gravityConstant: gpu.f32,
            dT: gpu.f32,
        });
        this.workGroupsCount = Math.ceil(this.bodiesCount / this.workgroupSize);
        const [bodyDescriptions, initialState] = this.createUniverse();
        const initialStateView = Universe.bodyState.view(initialState);
        /* Pipeline */
        this.pipeline = computeShader.computePipeline("c_main");
        const computeBindGroupLayout = this.pipeline.getBindGroupLayout(0);
        /* Buffers */
        this.bodyDescriptionsBuffer = device.buffer("bodyDescriptions", GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, Universe.bodyDescription.view(bodyDescriptions));
        this.uniformsBuffer = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.view([{
                bodyPointedness: 0.1,
                gravityConstant: 1000,
                dT: 0.0001
            }]));
        this.stateBuffers = [
            device.buffer("state0", GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, initialStateView),
            device.buffer("state1", GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, initialStateView.byteLength),
        ];
        /* Bind Groups */
        this.bindGroups = [
            this.device.bindGroup(computeBindGroupLayout, [this.bodyDescriptionsBuffer, this.stateBuffers[0], this.stateBuffers[1], this.uniformsBuffer]),
            this.device.bindGroup(computeBindGroupLayout, [this.bodyDescriptionsBuffer, this.stateBuffers[1], this.stateBuffers[0], this.uniformsBuffer]),
        ];
        this.currentBuffer = 0;
    }
    get currentState() {
        return this.stateBuffers[this.currentBuffer];
    }
    get bodyPointedness() {
        return this.uniformsBuffer.get(this.uniformsStruct.members.bodyPointedness);
    }
    set bodyPointedness(v) {
        this.uniformsBuffer.set(this.uniformsStruct.members.bodyPointedness, v);
    }
    get gravityConstant() {
        return this.uniformsBuffer.get(this.uniformsStruct.members.gravityConstant);
    }
    set gravityConstant(v) {
        this.uniformsBuffer.set(this.uniformsStruct.members.gravityConstant, v);
    }
    get dT() {
        return this.uniformsBuffer.get(this.uniformsStruct.members.dT);
    }
    set dT(v) {
        this.uniformsBuffer.set(this.uniformsStruct.members.dT, v);
    }
    recreateUniverse(universeRadius = 12) {
        const [bodyDescriptions, initialState] = this.createUniverse(universeRadius);
        const initialStateView = Universe.bodyState.view(initialState);
        this.bodyDescriptionsBuffer.writeAt(0, Universe.bodyDescription.view(bodyDescriptions));
        this.stateBuffers[0].writeAt(0, initialStateView);
        this.stateBuffers[1].writeAt(0, initialStateView);
    }
    createUniverse(universeRadius = 12) {
        const descriptions = [];
        const initialState = [];
        for (let i = 0; i < this.bodiesCount; i++) {
            const mass = skewDown(Math.random(), 16) * 0.999 + 0.001;
            const radius = Math.pow(mass, (1 / 3));
            const p = randomVector(universeRadius);
            const v = randomVector(0.001 / mass);
            descriptions.push({ mass: 100 * mass, radius });
            initialState.push({ position: p, velocity: v });
        }
        return [descriptions, initialState];
    }
    tick() {
        this.device.enqueueCommand("compute", encoder => {
            encoder.computePass(pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, this.bindGroups[this.currentBuffer]);
                pass.dispatchWorkgroups(this.workGroupsCount);
            });
        });
        this.currentBuffer ^= 1;
    }
}
Universe.bodyDescription = gpu.struct({
    mass: gpu.f32,
    radius: gpu.f32,
});
Universe.bodyState = gpu.struct({
    position: gpu.f32.x3,
    velocity: gpu.f32.x3,
});
function randomVector(radius) {
    const cosYA = 1 - 2 * Math.random();
    const sinYA = Math.sqrt(1 - cosYA * cosYA);
    const xa = 2 * Math.PI * Math.random();
    const r = radius * skewUp(Math.random(), 100);
    const ry = r * sinYA;
    const x = ry * Math.cos(xa);
    const y = r * (cosYA);
    const z = ry * Math.sin(xa);
    return [x, y, z];
}
function skewUp(x, s) {
    return skewDown(x, 1 / s);
}
function skewDown(x, s) {
    return Math.pow(x, s);
}
export function newUniverse(device) {
    return __awaiter(this, void 0, void 0, function* () {
        const limits = device.device.limits;
        const workgroupSize = Math.max(limits.maxComputeWorkgroupSizeX, limits.maxComputeWorkgroupSizeY, limits.maxComputeWorkgroupSizeZ);
        console.warn(`Workgroup Size: ${workgroupSize}`);
        const shaderModule = yield device.loadShaderModule("gravity-compute.wgsl", code => code.replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`));
        return new Universe(device, workgroupSize, shaderModule);
    });
}
//# sourceMappingURL=universe.js.map