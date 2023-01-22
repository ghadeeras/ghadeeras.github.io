import { aether, gear } from "/gen/libs.js";
import { wgl, gltf } from "../djee/index.js"
import { View, ViewFactory, ViewInputs } from "./view.js";

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

const projection = new aether.PerspectiveProjection(1, null, false, true)

export class GLView implements View {

    private context: wgl.Context;

    private position: wgl.Attribute;
    private normal: wgl.Attribute;

    private uPositionsMat: wgl.Uniform;
    private uNormalsMat: wgl.Uniform;
    private uProjectionMat: wgl.Uniform;
    private uModelViewMat: wgl.Uniform;
    private uLightPosition: wgl.Uniform;
    private uLightRadius: wgl.Uniform;
    private uColor: wgl.Uniform;
    private uShininess: wgl.Uniform;
    private uFogginess: wgl.Uniform;

    private renderer: wgl.GLRenderer | null = null

    private _viewMatrix: aether.Mat<4> = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
    private _modelMatrix: aether.Mat<4> = aether.mat4.identity()

    constructor(canvasId: string, vertexShaderCode: string, fragmentShaderCode: string, inputs: ViewInputs) {
        this.context = wgl.Context.of(canvasId);

        const program = this.context.link(
            this.context.vertexShader(vertexShaderCode),
            this.context.fragmentShader(fragmentShaderCode)
        )
        program.use();

        this.position = program.attribute("position");
        this.normal = program.attribute("normal");

        this.normal.setTo(0, 0, 1)

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
        gl.clearDepth(1);
        gl.clearColor(1, 1, 1, 1);

        inputs.lightPosition.attach(p => this.uLightPosition.data = p)
        inputs.lightRadius.attach(r => this.uLightRadius.data = [r])
        inputs.color.attach(c => this.uColor.data = c)
        inputs.shininess.attach(s => this.uShininess.data = [s])
        inputs.fogginess.attach(f => this.uFogginess.data = [f])
        inputs.matModel.attach(m => {
            this._modelMatrix = m
            this.updateModelViewMatrix();
        })
        inputs.matView.attach(v => {
            this._viewMatrix = v
            this.updateModelViewMatrix();
        })

        inputs.matProjection.attach(m => this.projectionMatrix = m)

        inputs.modelUri.attach(async (modelUri) => {
            this.statusUpdater("Loading model ...")
            try {
                this._modelMatrix = aether.mat4.identity()
                this._viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
                this.updateModelViewMatrix()
                this.projectionMatrix =  projection.matrix(2, this.aspectRatio)
                const model = await gltf.graph.Model.create(modelUri)
                if (this.renderer) {
                    this.renderer.destroy()
                    this.renderer = null
                }
                this.renderer = new wgl.GLRenderer(model, this.context, {
                    "POSITION" : this.position,
                    "NORMAL" : this.normal,
                }, this.uPositionsMat, this.uNormalsMat)
                this.statusUpdater("Rendering model ...")
            } catch (e) {
                this.statusUpdater(`Error: ${e}`)
                console.error(e)
            }
        })

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
        this.uProjectionMat.data = aether.mat4.columnMajorArray(m)
    }

    get viewMatrix() {
        return this._viewMatrix
    }

    get modelMatrix() {
        return this._modelMatrix
    }

    private updateModelViewMatrix() {
        this.uModelViewMat.data = aether.mat4.columnMajorArray(aether.mat4.mul(this._viewMatrix, this._modelMatrix));
    }

    resize(): void {
        this.context.gl.viewport(0, 0, this.context.canvas.width, this.context.canvas.height)
        this.projectionMatrix = projection.matrix(this.focalLength, this.aspectRatio)
    }

    draw() {
        const gl = this.context.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.normal.setTo(0, 1, 0)
        if (this.renderer) {
            this.renderer.render(this.context)
        }
        gl.flush();
    }

    private statusUpdater: gear.Consumer<string> = () => {}

    readonly status: gear.Value<string> = new gear.Value(consumer => this.statusUpdater = consumer)

}

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "gltf.vert",
        fragmentShaderCode: "generic.frag"
    }, "/shaders")
    return inputs => new GLView(canvasId, shaders.vertexShaderCode, shaders.fragmentShaderCode, inputs)
}
