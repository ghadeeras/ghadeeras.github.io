import { mat4, PerspectiveProjection } from "aether";
import * as meta from './meta.js';
const projection = new PerspectiveProjection(1, null, false, false);
export class Visuals {
    constructor(app) {
        this.app = app;
        this._zoom = 1;
        this._aspectRatio = 1;
        this._viewMatrix = mat4.lookAt([0, 0, -24]);
        this._modelMatrix = mat4.identity();
        /* Buffers */
        this.buffer = app.device.syncBuffer({
            label: "uniforms",
            usage: ["UNIFORM"],
            data: meta.visualsUniforms.view([{
                    mvpMatrix: this.mvpMatrix,
                    mvMatrix: this.modelMatrix,
                    mMatrix: this.modelMatrix,
                    radiusScale: 0.06
                }])
        });
        /* Bind Groups */
        this.bindGroup = app.layout.groupLayouts.visuals.bindGroup({
            uniforms: this.buffer
        }, "visualsGroup");
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
        return this.buffer.get(meta.visualsUniforms.members.radiusScale);
    }
    set radiusScale(v) {
        this.buffer.set(meta.visualsUniforms.members.radiusScale, v);
    }
    get mvpMatrix() {
        return mat4.mul(this.projectionViewMatrix, this._modelMatrix);
    }
    get mvMatrix() {
        return mat4.mul(this._viewMatrix, this._modelMatrix);
    }
    get projectionViewMatrix() {
        return mat4.mul(projection.matrix(this.zoom, this.aspectRatio), this.viewMatrix);
    }
    updateMvpMatrix() {
        this.buffer.set(meta.visualsUniforms.members.mvpMatrix, this.mvpMatrix);
        this.buffer.set(meta.visualsUniforms.members.mMatrix, this.modelMatrix);
    }
}
//# sourceMappingURL=visuals.js.map