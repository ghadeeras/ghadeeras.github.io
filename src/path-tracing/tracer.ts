import * as aether from "aether"
import { gpu } from "lumen"
import { NULL, Scene } from './scene.js'

export type UniformsStruct = gpu.DataTypeOf<typeof uniformsStruct>
export const uniformsStruct = gpu.struct({
    matrix: gpu.mat3x3,
    position: gpu.f32.x3,
    focalLength: gpu.f32,
    aspectRatio: gpu.f32,
    samplesPerPixel: gpu.u32,
}, ["matrix", "position", "focalLength", "aspectRatio", "samplesPerPixel"])

export type VolumeStruct = gpu.DataTypeOf<typeof volumeStruct>
export const volumeStruct = gpu.struct({
    min: gpu.f32.x3,
    max: gpu.f32.x3,
    invSize: gpu.f32.x3,
}, ["min", "max", "invSize"])

export type FaceDirectionsStruct = gpu.DataTypeOf<typeof faceDirectionsStruct>
export const faceDirectionsStruct = gpu.struct({
    lights: gpu.u32.times(4),
}, ["lights"])

export type BoxStruct = gpu.DataTypeOf<typeof boxStruct>
export const boxStruct = gpu.struct({
    volume: volumeStruct,
    faceMaterials: gpu.u32.times(6),
}, ["volume", "faceMaterials"])

export type BoxDirectionsStruct = gpu.DataTypeOf<typeof boxStruct>
export const boxDirectionsStruct = gpu.struct({
    faces: faceDirectionsStruct.times(6),
}, ["faces"])

export type RectangleStruct = gpu.DataTypeOf<typeof rectangleStruct>
export const rectangleStruct = gpu.struct({
    position: gpu.f32.x3,
    size: gpu.f32.x2,
    face: gpu.i32,
    area: gpu.f32,
}, ["position", "size", "face", "area"])

export type CellStruct = gpu.DataTypeOf<typeof cellStruct>
export const cellStruct = gpu.struct({
    boxes: gpu.u32.times(8),
    size: gpu.u32,
}, ["boxes", "size"])

export class Tracer {

    private readonly device: gpu.Device

    private readonly pipeline: GPURenderPipeline
    private readonly groupLayout: GPUBindGroupLayout

    readonly materialsBuffer: gpu.DataBuffer
    readonly boxesBuffer: gpu.DataBuffer

    readonly uniformsBuffer: gpu.DataBuffer 
    private readonly gridBuffer: gpu.DataBuffer
    private readonly clockBuffer: gpu.DataBuffer

    private readonly importantDirectionsBuffer: gpu.DataBuffer

    private readonly group: GPUBindGroup

    private _matrix = aether.mat3.identity()
    private _position = aether.vec3.of(32, 32, 32)
    private _samplesPerPixel = 1
    private _focalLength = Math.SQRT2

    constructor(shaderModule: gpu.ShaderModule, private canvas: gpu.Canvas, readonly scene: Scene, readonly colorFormat: GPUTextureFormat | null, readonly normalsFormat: GPUTextureFormat | null) {
        this.device = shaderModule.device

        this.pipeline = this.device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                colorFormat,
                normalsFormat
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            },
            layout: "auto"
        })
        this.groupLayout = this.pipeline.getBindGroupLayout(0)

        this.uniformsBuffer = this.createUniformsBuffer()
        this.materialsBuffer = this.createMaterialsBuffer()
        this.boxesBuffer = this.createBoxesBuffer()
        this.gridBuffer = this.createGridBuffer()
        this.clockBuffer = this.createClockBuffer()

        this.importantDirectionsBuffer = this.createImportantDirectionsBuffer()

        this.group = this.device.wrapped.createBindGroup({
            layout: this.groupLayout, 
            entries: [
                this.uniformsBuffer,
                this.materialsBuffer,
                this.boxesBuffer,
                this.gridBuffer,
                this.importantDirectionsBuffer,
                this.clockBuffer,
            ].map((r, i) => ({
                binding: i,
                resource: r.asBindingResource()
            }))
        })
    }

    static async create(device: gpu.Device, canvas: gpu.Canvas, scene: Scene, colorFormat: GPUTextureFormat | null, normalsFormat: GPUTextureFormat | null) {
        return new Tracer(await device.loadShaderModule("path-tracing.wgsl"), canvas, scene, colorFormat, normalsFormat)
    }

    render(encoder: gpu.CommandEncoder, colorAttachment: GPURenderPassColorAttachment | null, normalsAttachment: GPURenderPassColorAttachment | null) {
        encoder.renderPass(
            { colorAttachments: [ colorAttachment, normalsAttachment ] },
            pass => {
                pass.setBindGroup(0, this.group)
                pass.setPipeline(this.pipeline)
                pass.draw(4)
            }
        )
    }

    get matrix() {
        return this._matrix
    }

    set matrix(m: aether.Mat3) {
        this._matrix = m
        const v = gpu.mat3x3.view([m])
        this.uniformsBuffer.set(uniformsStruct.members.matrix).fromData(v)
    }

    get position() {
        return this._position
    }

    set position(p: aether.Vec3) {
        const position = this.clamp(p)
        this._position = position
        const v = gpu.f32.x3.view([position])
        this.uniformsBuffer.set(uniformsStruct.members.position).fromData(v)
    }

    get samplesPerPixel() {
        return this._samplesPerPixel
    }

    set samplesPerPixel(spp: number) {
        this._samplesPerPixel = spp
        const v = gpu.u32.view([spp])
        this.uniformsBuffer.set(uniformsStruct.members.samplesPerPixel).fromData(v)
    }

    get focalRatio() {
        return this._focalLength
    }

    set focalRatio(f: number) {
        this._focalLength = f
        const v = gpu.f32.view([f])
        this.uniformsBuffer.set(uniformsStruct.members.focalLength).fromData(v)
    }

    private createUniformsBuffer() {
        const width = this.canvas.size.width
        const height = this.canvas.size.height ?? this.canvas.size.width
        const dataView = uniformsStruct.view([{
            matrix: this._matrix,
            position: this._position,
            focalLength: this._focalLength,
            aspectRatio: width / height,
            samplesPerPixel: this._samplesPerPixel,
        }])
        return this.canvas.device.dataBuffer("uniforms", {
            usage: ["UNIFORM"], 
            data: dataView
        })
    }
    
    private createMaterialsBuffer() {
        const dataView = gpu.f32.x4.view(this.scene.materials)
        return this.device.dataBuffer("materials", {
            usage: ["STORAGE"], 
            data: dataView
        })
    }
    
    private createBoxesBuffer() {
        const dataView = boxStruct.view(this.scene.boxes)
        return this.device.dataBuffer("boxes", {
            usage: ["STORAGE"], 
            data: dataView
        })
    }
    
    private createGridBuffer() {
        const dataView = cellStruct.view(this.scene.grid)
        return this.device.dataBuffer("grid", {
            usage: ["STORAGE"], 
            data: dataView
        })
    }

    private createImportantDirectionsBuffer() {
        const dataView = boxDirectionsStruct.view(this.scene.boxes.length)
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
            })
        } 
        return this.device.dataBuffer("importantDirections", {
            usage: ["STORAGE"], 
            data: dataView
        })
    }
    
    private createClockBuffer() {
        const dataView = gpu.u32.view([0])
        return this.device.dataBuffer("clock", {
            usage: ["STORAGE"], 
            data: dataView
        })
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
