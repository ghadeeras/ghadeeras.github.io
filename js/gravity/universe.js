import * as meta from './meta.js';
export class Universe {
    constructor(app, bodyDescriptions, initialState, bodiesCount = bodyDescriptions.length) {
        this.bodiesCount = bodiesCount;
        const initialStateView = meta.bodyState.view(initialState);
        const device = app.device;
        /* Buffers */
        this.bodyDescriptionsBuffer = device.buffer("bodyDescriptions", GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, meta.bodyDescription.view(bodyDescriptions));
        this.uniformsBuffer = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, meta.physicsUniforms.view([{
                bodyFluffiness: 1.0 / 0.1,
                gravityConstant: 1000,
                dT: 0.0001
            }]));
        const stateBufferUsage = GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        this.buffers = [
            device.buffer("state0", stateBufferUsage, initialStateView),
            device.buffer("state1", stateBufferUsage, initialStateView.byteLength),
        ];
        /* Bind Groups */
        this.bindGroups = [
            app.layout.groupLayouts.universe.instance("universeGroup0", {
                universeDesc: this.bodyDescriptionsBuffer,
                currentState: this.buffers[0],
                nextState: this.buffers[1],
                uniforms: this.uniformsBuffer,
            }),
            app.layout.groupLayouts.universe.instance("universeGroup1", {
                universeDesc: this.bodyDescriptionsBuffer,
                currentState: this.buffers[1],
                nextState: this.buffers[0],
                uniforms: this.uniformsBuffer,
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
        return 1 / this.uniformsBuffer.get(meta.physicsUniforms.members.bodyFluffiness);
    }
    set bodyPointedness(p) {
        this.uniformsBuffer.set(meta.physicsUniforms.members.bodyFluffiness, 1 / p);
    }
    get gravityConstant() {
        return this.uniformsBuffer.get(meta.physicsUniforms.members.gravityConstant);
    }
    set gravityConstant(v) {
        this.uniformsBuffer.set(meta.physicsUniforms.members.gravityConstant, v);
    }
    get dT() {
        return this.uniformsBuffer.get(meta.physicsUniforms.members.dT);
    }
    set dT(v) {
        this.uniformsBuffer.set(meta.physicsUniforms.members.dT, v);
    }
    set state(state) {
        const initialStateView = meta.bodyState.view(state);
        this.buffers[0].writeAt(0, initialStateView);
        this.buffers[1].writeAt(0, initialStateView);
    }
    set bodyDescriptions(bodyDescriptions) {
        const bodyDescriptionsView = meta.bodyDescription.view(bodyDescriptions);
        this.bodyDescriptionsBuffer.writeAt(0, bodyDescriptionsView);
    }
}
//# sourceMappingURL=universe.js.map