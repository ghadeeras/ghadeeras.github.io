import { aether } from '/gen/libs.js';
import * as gpu from '../djee/gpu/index.js';
const projection = new aether.PerspectiveProjection(1, null, false, false);
class VisualsLayout {
    constructor(device) {
        this.device = device;
        this.bindGroupLayout = device.groupLayout("visualsBindGroupLayout", VisualsLayout.bindGroupLayoutEntries);
    }
    instance() {
        return new Visuals(this);
    }
}
VisualsLayout.bindGroupLayoutEntries = {
    uniforms: {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
            type: "uniform"
        }
    }
};
VisualsLayout.uniformsStruct = gpu.struct({
    mvpMatrix: gpu.f32.x4.x4,
    mvMatrix: gpu.f32.x4.x4,
    mMatrix: gpu.f32.x4.x4,
    radiusScale: gpu.f32,
});
export { VisualsLayout };
export class Visuals {
    constructor(layout) {
        this.layout = layout;
        this._zoom = 1;
        this._aspectRatio = 1;
        this._viewMatrix = aether.mat4.lookAt([0, 0, -24]);
        this._modelMatrix = aether.mat4.identity();
        /* Buffers */
        this.buffer = layout.device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, VisualsLayout.uniformsStruct.view([{
                mvpMatrix: this.mvpMatrix,
                mvMatrix: this.modelMatrix,
                mMatrix: this.modelMatrix,
                radiusScale: 0.06
            }]));
        /* Bind Groups */
        this.bindGroup = layout.bindGroupLayout.instance("visualsGroup", {
            uniforms: this.buffer
        });
    }
    get zoom() {
        return this._zoom;
    }
    set zoom(z) {
        this._zoom = z;
        this.updateMvpMatrix();
    }
    get aspectRatio() {
        return this._aspectRatio;
    }
    set aspectRatio(r) {
        this._aspectRatio = r;
        this.updateMvpMatrix();
    }
    get viewMatrix() {
        return this._viewMatrix;
    }
    set viewMatrix(m) {
        this._viewMatrix = m;
        this.updateMvpMatrix();
    }
    get modelMatrix() {
        return this._modelMatrix;
    }
    set modelMatrix(m) {
        this._modelMatrix = m;
        this.updateMvpMatrix();
    }
    get radiusScale() {
        return this.buffer.get(VisualsLayout.uniformsStruct.members.radiusScale);
    }
    set radiusScale(v) {
        this.buffer.set(VisualsLayout.uniformsStruct.members.radiusScale, v);
    }
    get mvpMatrix() {
        return aether.mat4.mul(this.projectionViewMatrix, this._modelMatrix);
    }
    get mvMatrix() {
        return aether.mat4.mul(this._viewMatrix, this._modelMatrix);
    }
    get projectionViewMatrix() {
        return aether.mat4.mul(projection.matrix(this.zoom, this.aspectRatio), this.viewMatrix);
    }
    updateMvpMatrix() {
        this.buffer.set(VisualsLayout.uniformsStruct.members.mvpMatrix, this.mvpMatrix);
        this.buffer.set(VisualsLayout.uniformsStruct.members.mMatrix, this.modelMatrix);
    }
}
//# sourceMappingURL=visuals.js.map