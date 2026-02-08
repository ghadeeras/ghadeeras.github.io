import * as meta from './meta.js';
export class Universe {
    constructor(app, bodyDescriptions, initialState, bodiesCount = bodyDescriptions.length) {
        this.bodiesCount = bodiesCount;
        const initialStateView = meta.bodyState.view(initialState);
        const device = app.device;
        /* Buffers */
        this.bodyDescriptionsBuffer = device.dataBuffer({
            label: "bodyDescriptions",
            usage: ["VERTEX", "STORAGE"],
            data: meta.bodyDescription.view(bodyDescriptions)
        });
        this.uniformsBuffer = device.syncBuffer({
            label: "uniforms",
            usage: ["UNIFORM"],
            data: meta.physicsUniforms.view([{
                    bodyFluffiness: 1.0 / 0.1,
                    gravityConstant: 1000,
                    dT: 0.0001
                }])
        });
        const buffers = device.dataBuffers({
            state0: { usage: ["VERTEX", "STORAGE"], data: initialStateView },
            state1: { usage: ["VERTEX", "STORAGE"], size: initialStateView.byteLength }
        });
        this.buffers = [buffers.state0, buffers.state1];
        /* Bind Groups */
        const bindGroups = app.layout.groupLayouts.universe.bindGroups({
            universeGroup0: {
                universeDesc: this.bodyDescriptionsBuffer,
                currentState: this.buffers[0],
                nextState: this.buffers[1],
                uniforms: this.uniformsBuffer,
            },
            universeGroup1: {
                universeDesc: this.bodyDescriptionsBuffer,
                currentState: this.buffers[1],
                nextState: this.buffers[0],
                uniforms: this.uniformsBuffer,
            }
        });
        this.bindGroups = [bindGroups.universeGroup0, bindGroups.universeGroup1];
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
        this.buffers[0].set().fromData(initialStateView);
        this.buffers[1].set().fromData(initialStateView);
    }
    set bodyDescriptions(bodyDescriptions) {
        const bodyDescriptionsView = meta.bodyDescription.view(bodyDescriptions);
        this.bodyDescriptionsBuffer.set().fromData(bodyDescriptionsView);
    }
}
//# sourceMappingURL=universe.js.map