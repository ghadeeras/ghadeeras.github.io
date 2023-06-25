import { aether } from '/gen/libs.js'
import * as gpu from '../djee/gpu/index.js'

const projection = new aether.PerspectiveProjection(1, null, false, false)

export type VisualsBindGroupLayout = gpu.BindGroupLayout<typeof VisualsLayout.bindGroupLayoutEntries>
export type VisualsBindGroup = gpu.BindGroup<typeof VisualsLayout.bindGroupLayoutEntries>

export class VisualsLayout {

    static readonly bindGroupLayoutEntries = {
        uniforms: gpu.binding(0, GPUShaderStage.VERTEX, gpu.buffer("uniform"))
    } satisfies gpu.BindGroupLayoutEntries

    static readonly uniformsStruct = gpu.struct({
        mvpMatrix: gpu.f32.x4.x4,
        mvMatrix: gpu.f32.x4.x4,
        mMatrix: gpu.f32.x4.x4,
        radiusScale: gpu.f32,
    })

    readonly bindGroupLayout: VisualsBindGroupLayout

    constructor(readonly device: gpu.Device) {
        this.bindGroupLayout = device.groupLayout("visualsBindGroupLayout", VisualsLayout.bindGroupLayoutEntries)
    }

    instance() {
        return new Visuals(this)
    }

}

export class Visuals {

    readonly buffer: gpu.SyncBuffer
    readonly bindGroup: VisualsBindGroup

    private _zoom = 1
    private _aspectRatio = 1
    private _viewMatrix = aether.mat4.lookAt([0, 0, -24])
    private _modelMatrix = aether.mat4.identity()

    constructor(readonly layout: VisualsLayout) {
        /* Buffers */
        this.buffer = layout.device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, VisualsLayout.uniformsStruct.view([{
            mvpMatrix: this.mvpMatrix,
            mvMatrix: this.modelMatrix,
            mMatrix: this.modelMatrix,
            radiusScale: 0.06
        }]))

        /* Bind Groups */
        this.bindGroup = layout.bindGroupLayout.instance("visualsGroup", {
            uniforms: this.buffer
        })
    }

    get zoom() {
        return this._zoom
    }

    set zoom(z: number) {
        this._zoom = z
        this.updateMvpMatrix()
    }

    get aspectRatio() {
        return this._aspectRatio
    }

    set aspectRatio(r: number) {
        this._aspectRatio = r
        this.updateMvpMatrix()
    }

    get viewMatrix() {
        return this._viewMatrix
    }

    set viewMatrix(m: aether.Mat<4>) {
        this._viewMatrix = m
        this.updateMvpMatrix()
    }

    get modelMatrix() {
        return this._modelMatrix
    }

    set modelMatrix(m: aether.Mat<4>) {
        this._modelMatrix = m
        this.updateMvpMatrix()
    }

    get radiusScale() {
        return this.buffer.get(VisualsLayout.uniformsStruct.members.radiusScale)
    }

    set radiusScale(v: number) {
        this.buffer.set(VisualsLayout.uniformsStruct.members.radiusScale, v)
    }

    get mvpMatrix() {
        return aether.mat4.mul(
            this.projectionViewMatrix,
            this._modelMatrix
        )
    }

    get mvMatrix() {
        return aether.mat4.mul(
            this._viewMatrix,
            this._modelMatrix
        )
    }

    get projectionViewMatrix(): aether.Mat4 {
        return aether.mat4.mul(
            projection.matrix(this.zoom, this.aspectRatio),
            this.viewMatrix
        )
    }

    private updateMvpMatrix() {
        this.buffer.set(VisualsLayout.uniformsStruct.members.mvpMatrix, this.mvpMatrix)
        this.buffer.set(VisualsLayout.uniformsStruct.members.mMatrix, this.modelMatrix)
    }

}
