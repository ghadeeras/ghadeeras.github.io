import * as gpu from '../djee/gpu/index.js'
import { DeferredComputation } from '../../gear/latest/scheduling.js'

const WORKGROUP_SIZE = 256

export class Universe {

    static readonly bodyDescription = gpu.struct({
        mass: gpu.f32,
        radius: gpu.f32,
    }) 

    static readonly bodyState = gpu.struct({
        position: gpu.f32.x3,
        velocity: gpu.f32.x3,
    })

    readonly bodiesCount: number = 16384
    
    private readonly workGroupsCount: number = Math.ceil(this.bodiesCount / WORKGROUP_SIZE)

    private readonly pipeline: GPUComputePipeline
    
    readonly bodyDescriptionsBuffer: gpu.Buffer
    private readonly uniformsBuffer: gpu.Buffer
    private readonly stateBuffers: [gpu.Buffer, gpu.Buffer]

    private readonly bindGroups: [GPUBindGroup, GPUBindGroup]

    private currentBuffer: number

    private readonly uniformsStruct = gpu.struct({
        bodyPointedness: gpu.f32,
        gravityConstant: gpu.f32,
        dT: gpu.f32,
    })
    
    private readonly uniformsView = this.uniformsStruct.view([{
        bodyPointedness: 0.1,
        gravityConstant: 1000,
        dT: 0.0001
    }])

    private updateUniformsData = new DeferredComputation(() => {
        this.uniformsBuffer.writeAt(0, this.uniformsView)
    })

    constructor(private device: gpu.Device, computeShader: gpu.ShaderModule) {
        const [bodyDescriptions, initialState] = this.createUniverse()
        const initialStateView = Universe.bodyState.view(initialState)
        
        /* Pipeline */
        this.pipeline = computeShader.createComputePipeline("c_main")
        const computeBindGroupLayout = this.pipeline.getBindGroupLayout(0)

        /* Buffers */
        this.bodyDescriptionsBuffer = device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, Universe.bodyDescription.view(bodyDescriptions))
        this.uniformsBuffer = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsView)
        this.stateBuffers = [
            device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, initialStateView),
            device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, initialStateView.byteLength),
        ]

        /* Bind Groups */
        this.bindGroups = [
            this.device.createBindGroup(computeBindGroupLayout, [this.bodyDescriptionsBuffer, this.stateBuffers[0], this.stateBuffers[1], this.uniformsBuffer]),
            this.device.createBindGroup(computeBindGroupLayout, [this.bodyDescriptionsBuffer, this.stateBuffers[1], this.stateBuffers[0], this.uniformsBuffer]),
        ]
        
        this.currentBuffer = 0
    }

    get currentState() {
        return this.stateBuffers[this.currentBuffer]
    }

    get bodyPointedness() {
        return this.getMember(this.uniformsStruct.members.bodyPointedness)
    }

    set bodyPointedness(v: number) {
        this.setMember(this.uniformsStruct.members.bodyPointedness, v)
    }

    get gravityConstant() {
        return this.getMember(this.uniformsStruct.members.gravityConstant)
    }

    set gravityConstant(v: number) {
        this.setMember(this.uniformsStruct.members.gravityConstant, v)
    }

    get dT() {
        return this.getMember(this.uniformsStruct.members.dT)
    }

    set dT(v: number) {
        this.setMember(this.uniformsStruct.members.dT, v)
    }

    private getMember<T>(member: gpu.Element<T>): T {
        return member.read(this.uniformsView)
    }

    private setMember<T>(member: gpu.Element<T>, value: T) {
        member.write(this.uniformsView, value)
        this.updateUniformsData.perform()
    }

    recreateUniverse(universeRadius: number = 12) {
        const [bodyDescriptions, initialState] = this.createUniverse(universeRadius)
        const initialStateView = Universe.bodyState.view(initialState)
        this.bodyDescriptionsBuffer.writeAt(0, Universe.bodyDescription.view(bodyDescriptions))
        this.stateBuffers[0].writeAt(0, initialStateView)
        this.stateBuffers[1].writeAt(0, initialStateView)
    }

    private createUniverse(universeRadius: number = 12): [gpu.DataTypeOf<typeof Universe.bodyDescription>[], gpu.DataTypeOf<typeof Universe.bodyState>[]] {
        const descriptions: gpu.DataTypeOf<typeof Universe.bodyDescription>[] = []
        const initialState: gpu.DataTypeOf<typeof Universe.bodyState>[] = []

        for (let i = 0; i < this.bodiesCount; i++) {
            const mass = skewDown(Math.random(), 10, 0.1)
            const radius = mass ** (1 / 3)
            const p = randomVector(universeRadius) 
            const v = randomVector(0.001 / mass)
            descriptions.push({ mass : 100 * mass, radius })
            initialState.push({ position : p, velocity: v })
        }

        return [descriptions, initialState]
    }

    tick() {
        this.device.enqueueCommand(encoder => {
            encoder.computePass(pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.bindGroups[this.currentBuffer])
                pass.dispatch(this.workGroupsCount)
            })
        })
        this.currentBuffer ^= 1
    }

}

function randomVector(radius: number): [number, number, number] {
    const ya = Math.PI * (Math.random() + Math.random()) / 2
    const xa = 2 * Math.PI * Math.random()
    const r = radius * skewUp(Math.random(), 100) // (1 - Math.abs(Math.random() + Math.random() - 1))
    const ry = r * Math.sin(ya)
    const x = ry * Math.cos(xa)
    const y = r * Math.cos(ya)
    const z = ry * Math.sin(xa)
    return [x, y, z]
}

function skewDown(x: number, s: number, m: number = 0): number {
    const r = x ** s
    return r * (1 - m)
}

function skewUp(x: number, s: number, m: number = 0): number {
    return 1 - skewDown(1 - x, s, m)
}

function skewMid(x: number, s: number): number {
    const y = 2 * x - 1
    const z = y >= 0 ?
        +skewDown(+y, s, 0) :
        -skewDown(-y, s, 0)
    return (z + 1) / 2
}

export async function newUniverse(device: gpu.Device) {
    const shaderModule = await device.loadShaderModule("gravity-compute.wgsl")
    return new Universe(device, shaderModule)
}
