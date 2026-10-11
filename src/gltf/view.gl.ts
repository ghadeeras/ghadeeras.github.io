import * as aether from "aether"
import * as gear from "gear"
import { wgl } from "lumen";
import { gltf, gltf_gl } from "../djee/index.js"
import { View, ViewFactory } from "./view.js";
import { GLTFRenderer } from "../djee/gltf/gltf.renderer.js";

export type ModelIndexEntry = {
    name: string,
    screenshot: string,
    variants: {
      glTF: string,
      "glTF-Binary": string,
      "glTF-Draco": string,
      "glTF-Embedded": string
    }
}

export class GLView implements View {

    private context: wgl.Context;
    private program: wgl.Program;
    private skyRenderer: SkyRenderer;
    private xrCompatible: boolean

    private position: wgl.Attribute;
    private normal: wgl.Attribute;

    private uPositionsMat: wgl.Uniform;
    private uNormalsMat: wgl.Uniform;
    private uProjectionMat: wgl.Uniform;
    private uModelViewMat: wgl.Uniform;
    private uLightPosition: wgl.Uniform;
    private uColor: wgl.Uniform;
    private uShininess: wgl.Uniform;
    private uMetalness: wgl.Uniform;

    private rendererFactory: gltf_gl.GLRendererFactory
    private renderer: GLTFRenderer<any, any, any, any, any, any, any> | null = null

    private _viewMatrix: aether.Mat4 = aether.mat4.identity()
    private _modelMatrix: aether.Mat4 = aether.mat4.identity()
    private _lightPosition: aether.Vec4 = [0, 0, 1, 0]

    private perspective: gltf.graph.Perspective = gltf.graph.defaultPerspective(true)

    constructor(canvasId: string, vertexShaderCode: string, fragmentShaderCode: string, skyVertexShaderCode: string, skyFragmentShaderCode: string) {
        try {
            this.context = wgl.Context.of(canvasId, { xrCompatible: true });
            this.xrCompatible = true
        } catch (e) {
            this.context = wgl.Context.of(canvasId);
            this.xrCompatible = false
        }

        this.skyRenderer = new SkyRenderer(this.context, skyVertexShaderCode, skyFragmentShaderCode)
        this.program = this.context.link(
            this.context.vertexShader(vertexShaderCode),
            this.context.fragmentShader(fragmentShaderCode)
        )
        this.program.use()

        this.position = this.program.attribute("position");
        this.normal = this.program.attribute("normal");

        this.normal.setTo(0, 0, 1)

        this.uPositionsMat = this.program.uniform("positionsMat");
        this.uNormalsMat = this.program.uniform("normalsMat");
        this.uProjectionMat = this.program.uniform("projectionMat");
        this.uModelViewMat = this.program.uniform("modelViewMat");

        this.uLightPosition = this.program.uniform("lightPosition");
        this.uColor = this.program.uniform("color");
        this.uShininess = this.program.uniform("shininess");
        this.uMetalness = this.program.uniform("metalness");

        this.rendererFactory = new gltf_gl.GLRendererFactory(this.context, {
            "POSITION": this.position,
            "NORMAL": this.normal,
        }, this.uPositionsMat, this.uNormalsMat)

        const gl = this.context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);
        gl.clearDepth(0);
    }

    get canvas(): HTMLCanvasElement {
        return this.context.canvas
    }

    set modelColor(color: [number, number, number, number]) {
        this.program.use()
        this.uColor.data = color
    }

    get lightPosition() {
        return aether.vec3.from(this._lightPosition)
    }

    set lightPosition(p: [number, number, number]) {
        this._lightPosition = [...p, 0]
        this.program.use()
        this.uLightPosition.data = aether.mat4.apply(this._viewMatrix, this._lightPosition)
        this.skyRenderer.program.use()
        this.skyRenderer.uLightPosition.data = this.uLightPosition.data
    }

    set roughnessFactor(s: number) {
        this.program.use()
        this.uShininess.data = [1 - s]
    }

    set metallicFactor(m: number) {
        this.program.use()
        this.uMetalness.data = [m]
    }

    get aspectRatio(): number {
        return this.context.canvas.width / this.context.canvas.height;
    }

    get focalLength() {
        const m = this.projectionMatrix
        const fl = Math.max(m[0][0], m[1][1]);
        return fl > 0 ? fl : 2
    }

    get projectionMatrix() {
        return aether.mat4.from(this.uProjectionMat.data)
    }

    set projectionMatrix(m: aether.Mat4) {
        this.program.use()
        this.uProjectionMat.data = aether.mat4.columnMajorArray(m)
        this.skyRenderer.program.use()
        this.skyRenderer.uProjectionMat.data = this.uProjectionMat.data
    }

    get viewMatrix() {
        return this._viewMatrix
    }

    set viewMatrix(m: aether.Mat4) {
        this._viewMatrix = m
        this.lightPosition = this.lightPosition
        this.updateModelViewMatrix();
    }

    get modelMatrix() {
        return this._modelMatrix
    }

    set modelMatrix(m: aether.Mat4) {
        this._modelMatrix = m
        this.updateModelViewMatrix();
    }

    private updateModelViewMatrix() {
        this.program.use()
        this.uModelViewMat.data = aether.mat4.columnMajorArray(aether.mat4.mul(this._viewMatrix, this._modelMatrix));
    }

    async loadModel(modelUri: any): Promise<gltf.graph.Model> {
        const model = await gltf.graph.Model.create(modelUri, true);
        this.perspective = model.scene.perspectives[0]
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio)
        this._lightPosition = aether.mat4.apply(aether.mat4.inverse(this.perspective.matrix), aether.vec4.from(this.uLightPosition.data))
        this._viewMatrix = this.perspective.matrix;
        this._modelMatrix = this.perspective.modelMatrix;
        this.updateModelViewMatrix();
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
        this.renderer = await this.rendererFactory.newInstance(model);
        return model
    }

    resize(): void {
        this.context.gl.viewport(0, 0, this.context.canvas.width, this.context.canvas.height)
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio, this.focalLength)
    }

    draw(eye: number = 0) {
        const gl = this.context.gl;

        this.program.use()
        this.context.gl.disableVertexAttribArray(this.position.location)
        this.context.gl.disableVertexAttribArray(this.normal.location)

        this.skyRenderer.render(eye)

        this.program.use()
        gl.enable(gl.DEPTH_TEST)
        if (eye === 0) {
            gl.clear(gl.DEPTH_BUFFER_BIT)
        }
        if (this.renderer) {
            this.context.gl.enableVertexAttribArray(this.position.location)
            this.context.gl.enableVertexAttribArray(this.normal.location)
            this.normal.setTo(0, 0, 0)
            this.renderer.render(this.context)
        }
        gl.flush();
    }

    get xrContext(): WebGL2RenderingContext | null {
        return this.xrCompatible ? this.context.gl : null
    }

}

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "gltf.vert",
        fragmentShaderCode: "gltf.frag",
        skyVertexShaderCode: "gltf.sky.vert",
        skyFragmentShaderCode: "gltf.sky.frag",
    }, "/shaders")
    return () => new GLView(canvasId, shaders.vertexShaderCode, shaders.fragmentShaderCode, shaders.skyVertexShaderCode, shaders.skyFragmentShaderCode)
}

class SkyRenderer {

    readonly program: wgl.Program 
    readonly uProjectionMat: wgl.Uniform;
    readonly uLightPosition: wgl.Uniform;

    constructor(private context: wgl.Context, vertexShader: string, fragmentShader: string) {
        this.program = context.link(
            context.vertexShader(vertexShader),
            context.fragmentShader(fragmentShader)
        )
        this.program.use()
        this.uProjectionMat = this.program.uniform("projectionMat");
        this.uLightPosition = this.program.uniform("lightPosition");
        context.gl.clearColor(0.0625, 0.0625, 0.0625, 1);
    }

    render(eye: number = 0) {
        this.program.use()
        this.context.gl.disable(WebGL2RenderingContext.DEPTH_TEST)
        if (eye === 0) {
            this.context.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT)
        }
        this.context.gl.drawArrays(WebGL2RenderingContext.TRIANGLES, 0, 3)
    }

}
