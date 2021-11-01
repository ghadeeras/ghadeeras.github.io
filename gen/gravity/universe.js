var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DeferredComputation } from '../../gear/latest/scheduling.js';
const WORKGROUP_SIZE = 256;
export class Universe {
    constructor(device, computeShader) {
        this.device = device;
        this.bodiesCount = 16384;
        this.workGroupsCount = Math.ceil(this.bodiesCount / WORKGROUP_SIZE);
        this.universeUniformsData = [
            // bodyPointedness: f32;
            0.1,
            // gravityConstant: f32;
            1000,
            // dT: f32;
            0.0001,
            // padding
            0
        ];
        this.updateUniverseUniformsData = new DeferredComputation(() => {
            this.universeUniformsBuffer.writeAt(0, new Float32Array(this.universeUniformsData));
        });
        const [bodyDescriptions, initialState] = this.createUniverse();
        /* Pipeline */
        this.computePipeline = computeShader.createComputePipeline("c_main");
        const computeBindGroupLayout = this.computePipeline.getBindGroupLayout(0);
        /* Buffers */
        this.bodyDescriptionsBuffer = device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 1, new Float32Array(bodyDescriptions));
        this.universeUniformsBuffer = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, new Float32Array(this.universeUniformsData));
        this.stateBuffers = [
            device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, 1, new Float32Array(initialState)),
            device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, 1, initialState.length * Float32Array.BYTES_PER_ELEMENT),
        ];
        /* Bind Groups */
        this.computeBindGroups = [
            this.device.createBindGroup(computeBindGroupLayout, [this.bodyDescriptionsBuffer, this.stateBuffers[0], this.stateBuffers[1], this.universeUniformsBuffer]),
            this.device.createBindGroup(computeBindGroupLayout, [this.bodyDescriptionsBuffer, this.stateBuffers[1], this.stateBuffers[0], this.universeUniformsBuffer]),
        ];
        this.currentBuffer = 0;
    }
    get currentState() {
        return this.stateBuffers[this.currentBuffer];
    }
    get bodyPointedness() {
        return this.universeUniformsData[0];
    }
    set bodyPointedness(v) {
        this.universeUniformsData[0] = v;
        this.updateUniverseUniformsData.perform();
    }
    get gravityConstant() {
        return this.universeUniformsData[1];
    }
    set gravityConstant(v) {
        this.universeUniformsData[1] = v;
        this.updateUniverseUniformsData.perform();
    }
    get dT() {
        return this.universeUniformsData[2];
    }
    set dT(v) {
        this.universeUniformsData[2] = v;
        this.updateUniverseUniformsData.perform();
    }
    recreateUniverse(universeRadius = 12) {
        const [bodyDescriptions, initialState] = this.createUniverse(universeRadius);
        this.bodyDescriptionsBuffer.writeAt(0, new Float32Array(bodyDescriptions));
        this.stateBuffers[0].writeAt(0, new Float32Array(initialState));
        this.stateBuffers[1].writeAt(0, new Float32Array(initialState));
    }
    createUniverse(universeRadius = 12) {
        const descriptions = [];
        const initialState = [];
        for (let i = 0; i < this.bodiesCount; i++) {
            const mass = skewDown(Math.random(), 10, 0.1);
            const radius = Math.pow(mass, (1 / 3));
            const p = randomVector(universeRadius);
            const v = randomVector(0.001 / mass);
            descriptions.push(100 * mass, radius);
            initialState.push(...p, 1, ...v, 0);
        }
        return [descriptions, initialState];
    }
    tick() {
        this.device.device.queue.submit([
            this.device.encodeCommand(encoder => {
                encoder.computePass(pass => {
                    pass.setPipeline(this.computePipeline);
                    pass.setBindGroup(0, this.computeBindGroups[this.currentBuffer]);
                    pass.dispatch(this.workGroupsCount);
                });
            })
        ]);
        this.currentBuffer ^= 1;
    }
}
function randomVector(radius) {
    const ya = Math.PI * (Math.random() + Math.random()) / 2;
    const xa = 2 * Math.PI * Math.random();
    const r = radius * skewUp(Math.random(), 100); // (1 - Math.abs(Math.random() + Math.random() - 1))
    const ry = r * Math.sin(ya);
    const x = ry * Math.cos(xa);
    const y = r * Math.cos(ya);
    const z = ry * Math.sin(xa);
    return [x, y, z];
}
function skewDown(x, s, m = 0) {
    const r = Math.pow(x, s);
    return r * (1 - m);
}
function skewUp(x, s, m = 0) {
    return 1 - skewDown(1 - x, s, m);
}
function skewMid(x, s) {
    const y = 2 * x - 1;
    const z = y >= 0 ?
        +skewDown(+y, s, 0) :
        -skewDown(-y, s, 0);
    return (z + 1) / 2;
}
export function newUniverse(device) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaderModule = yield device.loadShaderModule("gravity-compute.wgsl");
        return new Universe(device, shaderModule);
    });
}
//# sourceMappingURL=universe.js.map