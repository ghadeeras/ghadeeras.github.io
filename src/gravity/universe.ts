import { DeferredComputation } from 'gear'
import * as gpu from '../djee/gpu/index.js'

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

    private readonly computePipeline: GPUComputePipeline
    
    readonly bodyDescriptionsBuffer: gpu.Buffer
    private readonly universeUniformsBuffer: gpu.Buffer
    private readonly stateBuffers: [gpu.Buffer, gpu.Buffer]

    private readonly computeBindGroups: [GPUBindGroup, GPUBindGroup]

    private currentBuffer: number

    private readonly universeUniformsData: number[] = [
        // bodyPointedness: f32;
        0.1,
        // gravityConstant: f32;
        1000,
        // dT: f32;
        0.0001,
        // padding
        0
    ]

    private updateUniverseUniformsData = new DeferredComputation(() => {
        this.universeUniformsBuffer.writeAt(0, new Float32Array(this.universeUniformsData))
    })

    constructor(private device: gpu.Device, computeShader: gpu.ShaderModule) {
        const [bodyDescriptions, initialState] = this.createUniverse()
        
        /* Pipeline */
        this.computePipeline = computeShader.createComputePipeline("c_main")
        const computeBindGroupLayout = this.computePipeline.getBindGroupLayout(0)

        /* Buffers */
        this.bodyDescriptionsBuffer = device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 1, new Float32Array(bodyDescriptions))
        this.universeUniformsBuffer = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, new Float32Array(this.universeUniformsData))
        this.stateBuffers = [
            device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, 1, new Float32Array(initialState)),
            device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, 1, initialState.length * Float32Array.BYTES_PER_ELEMENT),
        ]

        /* Bind Groups */
        this.computeBindGroups = [
            this.device.createBindGroup(computeBindGroupLayout, [this.bodyDescriptionsBuffer, this.stateBuffers[0], this.stateBuffers[1], this.universeUniformsBuffer]),
            this.device.createBindGroup(computeBindGroupLayout, [this.bodyDescriptionsBuffer, this.stateBuffers[1], this.stateBuffers[0], this.universeUniformsBuffer]),
        ]
        
        this.currentBuffer = 0  
    }

    get currentState() {
        return this.stateBuffers[this.currentBuffer]
    }

    get bodyPointedness() {
        return this.universeUniformsData[0]
    }

    set bodyPointedness(v: number) {
        this.universeUniformsData[0] = v
        this.updateUniverseUniformsData.perform()
    }

    get gravityConstant() {
        return this.universeUniformsData[1]
    }

    set gravityConstant(v: number) {
        this.universeUniformsData[1] = v
        this.updateUniverseUniformsData.perform()
    }

    get dT() {
        return this.universeUniformsData[2]
    }

    set dT(v: number) {
        this.universeUniformsData[2] = v
        this.updateUniverseUniformsData.perform()
    }

    recreateUniverse(universeRadius: number = 12) {
        const [bodyDescriptions, initialState] = this.createUniverse(universeRadius)
        this.bodyDescriptionsBuffer.writeAt(0, new Float32Array(bodyDescriptions))
        this.stateBuffers[0].writeAt(0, new Float32Array(initialState))
        this.stateBuffers[1].writeAt(0, new Float32Array(initialState))
    }

    private createUniverse(universeRadius: number = 12): [number[], number[]] {
        const descriptions: number[] = []
        const initialState: number[] = []

        for (let i = 0; i < this.bodiesCount; i++) {
            const mass = skewDown(Math.random(), 10, 0.1)
            const radius = mass ** (1 / 3)
            const p = randomVector(universeRadius) 
            const v = randomVector(0.001 / mass)
            descriptions.push(100 * mass, radius)
            initialState.push(...p, 1, ...v, 0)
        }

        return [descriptions, initialState]
    }

    tick() {
        this.device.enqueueCommand(encoder => {
            encoder.computePass(pass => {
                pass.setPipeline(this.computePipeline)
                pass.setBindGroup(0, this.computeBindGroups[this.currentBuffer])
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
