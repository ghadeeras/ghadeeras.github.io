import * as aether from '/aether/latest/index.js'
import * as gpu from "../djee/gpu/index.js"
import { Scene } from './scene.js'

export type UniformsStruct = gpu.DataTypeOf<typeof uniformsStruct>
export const uniformsStruct = gpu.struct({
    matrix: gpu.mat3x3,
    position: gpu.f32.x3,
    randomSeed: gpu.u32.x4,
    focalLength: gpu.f32,
    aspectRatio: gpu.f32,
    samplesPerPixel: gpu.u32,
}, ["matrix", "position", "randomSeed", "focalLength", "aspectRatio", "samplesPerPixel"])

export type VolumeStruct = gpu.DataTypeOf<typeof volumeStruct>
export const volumeStruct = gpu.struct({
    min: gpu.f32.x3,
    max: gpu.f32.x3,
    invSize: gpu.f32.x3,
}, ["min", "max", "invSize"])

export type FaceStruct = gpu.DataTypeOf<typeof faceStruct>
export const faceStruct = gpu.struct({
    lights: gpu.u32.x4,
    material: gpu.u32,
}, ["lights", "material"])

export type BoxStruct = gpu.DataTypeOf<typeof boxStruct>
export const boxStruct = gpu.struct({
    volume: volumeStruct,
    faceMaterials: gpu.u32.times(6),
}, ["volume", "faceMaterials"])

export type Cell = [number, number, number, number, number, number, number, number]
export const cell = gpu.u32.times(8)

const SEEDS_COUNT = 0x4000

export class Tracer {

    private readonly device: gpu.Device

    private readonly pipeline: GPURenderPipeline
    private readonly groupLayout: GPUBindGroupLayout

    private readonly uniformsBuffer: gpu.Buffer 
    private readonly materialsBuffer: gpu.Buffer
    private readonly boxesBuffer: gpu.Buffer
    private readonly gridBuffer: gpu.Buffer
    private readonly rngSeedsBuffer: gpu.Buffer

    private readonly group: GPUBindGroup

    private _matrix = aether.mat3.identity()
    private _position = aether.vec3.of(32, 32, 32)
    private _samplesPerPixel = 16
    private _focalRation = Math.SQRT2

    constructor(shaderModule: gpu.ShaderModule, private canvas: gpu.Canvas, private scene: Scene) {
        this.device = shaderModule.device

        this.pipeline = this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                canvas
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            }
        })
        this.groupLayout = this.pipeline.getBindGroupLayout(0)

        this.uniformsBuffer = this.createUniformsBuffer()
        this.materialsBuffer = this.createMaterialsBuffer()
        this.boxesBuffer = this.createBoxesBuffer()
        this.gridBuffer = this.createGridBuffer()
        this.rngSeedsBuffer = this.createRNGSeedsBuffer()

        this.group = this.device.createBindGroup(this.groupLayout, [
            this.uniformsBuffer,
            this.materialsBuffer,
            this.boxesBuffer,
            this.gridBuffer
        ])
    }

    static async create(device: gpu.Device, canvas: gpu.Canvas, scene: Scene) {
        return new Tracer(await device.loadShaderModule("path-tracing.wgsl"), canvas, scene)
    }

    encode(encoder: gpu.CommandEncoder, colorAttachment: GPURenderPassColorAttachment) {
        encoder.renderPass(
            { colorAttachments: [ colorAttachment ] },
            pass => {
                pass.setBindGroup(0, this.group)
                pass.setPipeline(this.pipeline)
                pass.draw(4)
            }
        )
        const seed = uniformsStruct.members.randomSeed
        this.uniformsBuffer.copyingAt(seed.x.offset, this.rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoder)
        this.uniformsBuffer.copyingAt(seed.y.offset, this.rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoder)
        this.uniformsBuffer.copyingAt(seed.z.offset, this.rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoder)
        this.uniformsBuffer.copyingAt(seed.w.offset, this.rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoder)
    }

    get matrix() {
        return this._matrix
    }

    set matrix(m: aether.Mat3) {
        this._matrix = m
        const v = gpu.mat3x3.view([m])
        this.uniformsBuffer.writeAt(uniformsStruct.members.matrix.offset, v)
    }

    get position() {
        return this._position
    }

    set position(p: aether.Vec3) {
        const position = this.clamp(p)
        this._position = position
        const v = gpu.f32.x3.view([position])
        this.uniformsBuffer.writeAt(uniformsStruct.members.position.offset, v)
    }

    get samplesPerPixel() {
        return this._samplesPerPixel
    }

    set samplesPerPixel(spp: number) {
        this._samplesPerPixel = spp
        const v = gpu.u32.view([spp])
        this.uniformsBuffer.writeAt(uniformsStruct.members.samplesPerPixel.offset, v)
    }

    get focalRatio() {
        return this._focalRation
    }

    set focalRatio(f: number) {
        this._focalRation = f
        const v = gpu.f32.view([f])
        this.uniformsBuffer.writeAt(uniformsStruct.members.focalLength.offset, v)
    }

    private createUniformsBuffer() {
        const width = this.canvas.size.width
        const height = this.canvas.size.height ?? this.canvas.size.width
        const dataView = uniformsStruct.view([{
            matrix: this._matrix,
            position: this._position,
            randomSeed: [random(), random(), random(), random()],
            focalLength: this._focalRation,
            aspectRatio: width / height,
            samplesPerPixel: this._samplesPerPixel,
        }])
        return this.canvas.device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, dataView)
    }
    
    private createMaterialsBuffer() {
        const dataView = gpu.f32.x4.view(this.scene.materials)
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView)
    }
    
    private createBoxesBuffer() {
        const dataView = boxStruct.view(this.scene.boxes)
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView)
    }
    
    private createGridBuffer() {
        const dataView = cell.view(this.scene.grid)
        return this.device.buffer(GPUBufferUsage.STORAGE, dataView)
    }
    
    private createRNGSeedsBuffer() {
        const seeds: number[] = []
        for (let i = 0; i < SEEDS_COUNT; i++) {
            seeds.push(random())
        }
        const dataView = gpu.u32.view(seeds)
        return this.device.buffer(GPUBufferUsage.COPY_SRC, dataView)
    }
    
    private clamp(p: aether.Vec3) {
        const min = 0.5
        const max = this.scene.gridSize - 0.5
        return aether.vec3.min(
            aether.vec3.max(
                p,
                aether.vec3.of(min, min, min)
            ),
            aether.vec3.of(max, max, max)
        )
    }
    
}

function randomSeedOffset(): number {
    return Math.floor(Math.random() * SEEDS_COUNT) * Uint32Array.BYTES_PER_ELEMENT
}

function random(): number {
    return Math.round(Math.random() * 0xFFFFFFFF) | 1
}
