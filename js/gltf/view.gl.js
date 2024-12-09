import * as aether from "aether";
import * as gear from "gear";
import { wgl } from "lumen";
import { gltf, gltf_gl } from "../djee/index.js";
export class GLView {
    constructor(canvasId, vertexShaderCode, fragmentShaderCode) {
        this.renderer = null;
        this._viewMatrix = aether.mat4.identity();
        this._modelMatrix = aether.mat4.identity();
        this.perspective = gltf.graph.defaultPerspective(true);
        try {
            this.context = wgl.Context.of(canvasId, { xrCompatible: true });
            this.xrCompatible = true;
        }
        catch (e) {
            this.context = wgl.Context.of(canvasId);
            this.xrCompatible = false;
        }
        const program = this.context.link(this.context.vertexShader(vertexShaderCode), this.context.fragmentShader(fragmentShaderCode));
        program.use();
        this.position = program.attribute("position");
        this.normal = program.attribute("normal");
        this.normal.setTo(0, 0, 1);
        this.uPositionsMat = program.uniform("positionsMat");
        this.uNormalsMat = program.uniform("normalsMat");
        this.uProjectionMat = program.uniform("projectionMat");
        this.uModelViewMat = program.uniform("modelViewMat");
        this.uLightPosition = program.uniform("lightPosition");
        this.uLightRadius = program.uniform("lightRadius");
        this.uColor = program.uniform("color");
        this.uShininess = program.uniform("shininess");
        this.uFogginess = program.uniform("fogginess");
        const gl = this.context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);
        gl.clearDepth(0);
        gl.clearColor(1, 1, 1, 1);
    }
    get canvas() {
        return this.context.canvas;
    }
    set modelColor(color) {
        this.uColor.data = color;
    }
    set lightPosition(p) {
        this.uLightPosition.data = p;
    }
    set lightRadius(r) {
        this.uLightRadius.data = [r];
    }
    set shininess(s) {
        this.uShininess.data = [s];
    }
    set fogginess(f) {
        this.uFogginess.data = [f];
    }
    get aspectRatio() {
        return this.context.canvas.width / this.context.canvas.height;
    }
    get focalLength() {
        const m = this.projectionMatrix;
        const fl = Math.max(m[0][0], m[1][1]);
        return fl > 0 ? fl : 2;
    }
    get projectionMatrix() {
        return aether.mat4.from(this.uProjectionMat.data);
    }
    set projectionMatrix(m) {
        this.uProjectionMat.data = aether.mat4.columnMajorArray(m);
    }
    get viewMatrix() {
        return this._viewMatrix;
    }
    set viewMatrix(m) {
        this._viewMatrix = m;
        this.updateModelViewMatrix();
    }
    get modelMatrix() {
        return this._modelMatrix;
    }
    set modelMatrix(m) {
        this._modelMatrix = m;
        this.updateModelViewMatrix();
    }
    updateModelViewMatrix() {
        this.uModelViewMat.data = aether.mat4.columnMajorArray(aether.mat4.mul(this._viewMatrix, this._modelMatrix));
    }
    async loadModel(modelUri) {
        const model = await gltf.graph.Model.create(modelUri, true);
        this.perspective = model.scene.perspectives[0];
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio);
        this._viewMatrix = this.perspective.matrix;
        this._modelMatrix = this.perspective.modelMatrix;
        this.updateModelViewMatrix();
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
        this.renderer = new gltf_gl.GLRenderer(model, this.context, {
            "POSITION": this.position,
            "NORMAL": this.normal,
        }, this.uPositionsMat, this.uNormalsMat);
        return model;
    }
    resize() {
        this.context.gl.viewport(0, 0, this.context.canvas.width, this.context.canvas.height);
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio, this.focalLength);
    }
    draw(eye = 0) {
        const gl = this.context.gl;
        if (eye === 0) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }
        this.normal.setTo(0, 1, 0);
        if (this.renderer) {
            this.renderer.render(this.context);
        }
        gl.flush();
    }
    get xrContext() {
        return this.xrCompatible ? this.context.gl : null;
    }
}
export async function newViewFactory(canvasId) {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "gltf.vert",
        fragmentShaderCode: "gltf.frag"
    }, "/shaders");
    return () => new GLView(canvasId, shaders.vertexShaderCode, shaders.fragmentShaderCode);
}
//# sourceMappingURL=view.gl.js.map