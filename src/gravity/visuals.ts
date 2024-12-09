import * as aether from "aether"
import { gpu } from 'lumen'
import * as meta from './meta.js'

const projection = new aether.PerspectiveProjection(1, null, false, false)

export class Visuals {

    readonly buffer: gpu.SyncBuffer
    
    readonly bindGroup

    private _zoom = 1
    private _aspectRatio = 1
    private _viewMatrix = aether.mat4.lookAt([0, 0, -24])
    private _modelMatrix = aether.mat4.identity()

    constructor(readonly app: meta.App) {
        /* Buffers */
        this.buffer = app.device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, meta.visualsUniforms.view([{
            mvpMatrix: this.mvpMatrix,
            mvMatrix: this.modelMatrix,
            mMatrix: this.modelMatrix,
            radiusScale: 0.06
        }]))

        /* Bind Groups */
        this.bindGroup = app.layout.groupLayouts.visuals.instance("visualsGroup", {
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
        return this.buffer.get(meta.visualsUniforms.members.radiusScale)
    }

    set radiusScale(v: number) {
        this.buffer.set(meta.visualsUniforms.members.radiusScale, v)
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
        this.buffer.set(meta.visualsUniforms.members.mvpMatrix, this.mvpMatrix)
        this.buffer.set(meta.visualsUniforms.members.mMatrix, this.modelMatrix)
    }

}
