import * as gpu from '../djee/gpu/index.js'

export type BodyDescriptionStruct = gpu.DataTypeOf<typeof UniverseLayout.bodyDescription>
export type BodyStateStruct = gpu.DataTypeOf<typeof UniverseLayout.bodyState>

export type UniverseBindGroupLayout = gpu.BindGroupLayout<typeof UniverseLayout.bindGroupLayoutEntries> 

export type UniverseBindGroup = gpu.BindGroup<typeof UniverseLayout.bindGroupLayoutEntries> 

export class UniverseLayout {

    static readonly bindGroupLayoutEntries = {
        universeDesc: gpu.binding(0, GPUShaderStage.COMPUTE, gpu.buffer("read-only-storage")),
        currentState: gpu.binding(1, GPUShaderStage.COMPUTE, gpu.buffer("read-only-storage")),
        nextState: gpu.binding(2, GPUShaderStage.COMPUTE, gpu.buffer("storage")),
        universeUniforms: gpu.binding(3, GPUShaderStage.COMPUTE, gpu.buffer("uniform")),
    } satisfies gpu.BindGroupLayoutEntries

    static readonly uniformsStruct = gpu.struct({
        bodyFluffiness: gpu.f32,
        gravityConstant: gpu.f32,
        dT: gpu.f32,
    })
    
    static readonly bodyDescription = gpu.struct({
        mass: gpu.f32,
        radius: gpu.f32,
    }) 

    static readonly bodyState = gpu.struct({
        position: gpu.f32.x3,
        velocity: gpu.f32.x3,
    })

    readonly bindGroupLayout: UniverseBindGroupLayout

    constructor(readonly device: gpu.Device) {
        this.bindGroupLayout = this.device.groupLayout("universeGroupLayout", UniverseLayout.bindGroupLayoutEntries)
    }

    instance(bodyDescriptions: BodyDescriptionStruct[], initialState: BodyStateStruct[]) {
        return new Universe(this, bodyDescriptions, initialState, bodyDescriptions.length)
    }

}

export class Universe {

    readonly bodyDescriptionsBuffer: gpu.Buffer
    private readonly uniformsBuffer: gpu.SyncBuffer
    private readonly buffers: [gpu.Buffer, gpu.Buffer]

    private readonly bindGroups: [UniverseBindGroup, UniverseBindGroup]

    private currentBuffer: number

    constructor(layout: UniverseLayout, bodyDescriptions: BodyDescriptionStruct[], initialState: BodyStateStruct[], readonly bodiesCount: number) {
        const initialStateView = UniverseLayout.bodyState.view(initialState)
        
        /* Buffers */
        this.bodyDescriptionsBuffer = layout.device.buffer("bodyDescriptions", GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, UniverseLayout.bodyDescription.view(bodyDescriptions))
        this.uniformsBuffer = layout.device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, UniverseLayout.uniformsStruct.view([{
            bodyFluffiness: 1.0 / 0.1,
            gravityConstant: 1000,
            dT: 0.0001
        }]))
        const stateBufferUsage = GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        this.buffers = [
            layout.device.buffer("state0", stateBufferUsage, initialStateView),
            layout.device.buffer("state1", stateBufferUsage, initialStateView.byteLength),
        ]

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
        ]
        
        this.currentBuffer = 0
    }

    next() {
        const i = this.currentBuffer
        this.currentBuffer ^= 1
        return this.bindGroups[i]
    }

    get currentState() {
        return this.buffers[this.currentBuffer]
    }

    get bodyPointedness() {
        return 1 / this.uniformsBuffer.get(UniverseLayout.uniformsStruct.members.bodyFluffiness)
    }

    set bodyPointedness(p: number) {
        this.uniformsBuffer.set(UniverseLayout.uniformsStruct.members.bodyFluffiness, 1 / p)
    }

    get gravityConstant() {
        return this.uniformsBuffer.get(UniverseLayout.uniformsStruct.members.gravityConstant)
    }

    set gravityConstant(v: number) {
        this.uniformsBuffer.set(UniverseLayout.uniformsStruct.members.gravityConstant, v)
    }

    get dT() {
        return this.uniformsBuffer.get(UniverseLayout.uniformsStruct.members.dT)
    }

    set dT(v: number) {
        this.uniformsBuffer.set(UniverseLayout.uniformsStruct.members.dT, v)
    }

    set state(state: BodyStateStruct[]) {
        const initialStateView = UniverseLayout.bodyState.view(state)
        this.buffers[0].writeAt(0, initialStateView)
        this.buffers[1].writeAt(0, initialStateView)
    }

    set bodyDescriptions(bodyDescriptions: BodyDescriptionStruct[]) {
        const bodyDescriptionsView = UniverseLayout.bodyDescription.view(bodyDescriptions)
        this.bodyDescriptionsBuffer.writeAt(0, bodyDescriptionsView)
    }

}
