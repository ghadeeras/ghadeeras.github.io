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

    private viewMatrix: aether.Mat<4> = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
    private modelMatrix: aether.Mat<4> = aether.mat4.identity()

    private projectionMatrix = aether.mat4.projection(2, undefined, undefined, 2);

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

        this.uProjectionMat.data = aether.mat4.columnMajorArray(this.projectionMatrix);

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
            this.modelMatrix = m
            this.updateModelViewMatrix();
        })
        inputs.matView.attach(v => {
            this.viewMatrix = v
            this.updateModelViewMatrix();
        })

        inputs.modelUri.attach(async (modelUri) => {
            this.statusUpdater("Loading model ...")
            try {
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

    private updateModelViewMatrix() {
        this.uModelViewMat.data = aether.mat4.columnMajorArray(aether.mat4.mul(this.viewMatrix, this.modelMatrix));
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
