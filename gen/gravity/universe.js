import * as gpu from '../djee/gpu/index.js';
class UniverseLayout {
    constructor(device) {
        this.device = device;
        this.bindGroupLayout = this.device.groupLayout("universeGroupLayout", UniverseLayout.bindGroupLayoutEntries);
    }
    instance(bodyDescriptions, initialState) {
        return new Universe(this, bodyDescriptions, initialState, bodyDescriptions.length);
    }
}
UniverseLayout.bindGroupLayoutEntries = {
    universeDesc: {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "read-only-storage"
        }
    },
    currentState: {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "read-only-storage"
        }
    },
    nextState: {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "storage"
        }
    },
    universeUniforms: {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "uniform"
        }
    },
};
UniverseLayout.uniformsStruct = gpu.struct({
    bodyFluffiness: gpu.f32,
    gravityConstant: gpu.f32,
    dT: gpu.f32,
});
UniverseLayout.bodyDescription = gpu.struct({
    mass: gpu.f32,
    radius: gpu.f32,
});
UniverseLayout.bodyState = gpu.struct({
    position: gpu.f32.x3,
    velocity: gpu.f32.x3,
});
export { UniverseLayout };
export class Universe {
    constructor(layout, bodyDescriptions, initialState, bodiesCount) {
        this.bodiesCount = bodiesCount;
        const initialStateView = UniverseLayout.bodyState.view(initialState);
        /* Buffers */
        this.bodyDescriptionsBuffer = layout.device.buffer("bodyDescriptions", GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, UniverseLayout.bodyDescription.view(bodyDescriptions));
        this.uniformsBuffer = layout.device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, UniverseLayout.uniformsStruct.view([{
                bodyFluffiness: 1.0 / 0.1,
                gravityConstant: 1000,
                dT: 0.0001
            }]));
        const stateBufferUsage = GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        this.buffers = [
            layout.device.buffer("state0", stateBufferUsage, initialStateView),
            layout.device.buffer("state1", stateBufferUsage, initialStateView.byteLength),
        ];
        /* Bind Groups */
        this.bindGroups = [
            layout.bindGroupLayout.instance("universeGroup0", {
                universeDesc: this.bodyDescriptionsBuffer,
                currentState: this.buffers[0],
                nextState: this.buffers[1],
                universeUniforms: this.uniformsBuffer,
            }),
            layout.bindGroupLayout.instance("universeGroup1", {
                universeDesc: this.bodyDescriptionsBuffer,
                currentState: this.buffers[1],
                nextState: this.buffers[0],
                universeUniforms: this.uniformsBuffer,
            }),
        ];
        this.currentBuffer = 0;
    }
    next() {
        const i = this.currentBuffer;
        this.currentBuffer ^= 1;
        return this.bindGroups[i];
    }
    get currentState() {
        return this.buffers[this.currentBuffer];
    }
    get bodyPointedness() {
        return 1 / this.uniformsBuffer.get(UniverseLayout.uniformsStruct.members.bodyFluffiness);
    }
    set bodyPointedness(p) {
        this.uniformsBuffer.set(UniverseLayout.uniformsStruct.members.bodyFluffiness, 1 / p);
    }
    get gravityConstant() {
        return this.uniformsBuffer.get(UniverseLayout.uniformsStruct.members.gravityConstant);
    }
    set gravityConstant(v) {
        this.uniformsBuffer.set(UniverseLayout.uniformsStruct.members.gravityConstant, v);
    }
    get dT() {
        return this.uniformsBuffer.get(UniverseLayout.uniformsStruct.members.dT);
    }
    set dT(v) {
        this.uniformsBuffer.set(UniverseLayout.uniformsStruct.members.dT, v);
    }
    set state(state) {
        const initialStateView = UniverseLayout.bodyState.view(state);
        this.buffers[0].writeAt(0, initialStateView);
        this.buffers[1].writeAt(0, initialStateView);
    }
    set bodyDescriptions(bodyDescriptions) {
        const bodyDescriptionsView = UniverseLayout.bodyDescription.view(bodyDescriptions);
        this.bodyDescriptionsBuffer.writeAt(0, bodyDescriptionsView);
    }
}
//# sourceMappingURL=universe.js.map