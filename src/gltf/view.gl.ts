import { aether, gear } from "/gen/libs.js";
import { wgl, gltf } from "../djee/index.js"
import { ViewInputs } from "./view.js";

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

export class GLView {

    private context: wgl.Context;

    private position: wgl.Attribute;
    private normal: wgl.Attribute;

    private uPositionsMat: wgl.Uniform;
    private uNormalsMat: wgl.Uniform;
    private uProjectionMat: wgl.Uniform;
    private uLightPosition: wgl.Uniform;
    private uLightRadius: wgl.Uniform;
    private uColor: wgl.Uniform;
    private uShininess: wgl.Uniform;
    private uFogginess: wgl.Uniform;

    private model: gltf.ActiveModel<wgl.IndicesBuffer, wgl.AttributesBuffer> | null = null

    private viewMatrix: aether.Mat<4> = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
    private modelMatrix: aether.Mat<4> = aether.mat4.identity()

    private projectionMatrix = aether.mat4.projection(2);

    constructor(canvasId: string, vertexShaderCode: string, fragmentShaderCode: string, inputs: ViewInputs, modelUri: gear.Value<string>) {
        const shaders = {
            vertexShaderCode,
            fragmentShaderCode
        }

        this.context = wgl.Context.of(canvasId);

        const program = this.context.link(
            this.context.vertexShader(shaders.vertexShaderCode),
            this.context.fragmentShader(shaders.fragmentShaderCode)
        )
        program.use();

        this.position = program.attribute("position");
        this.normal = program.attribute("normal");

        this.normal.setTo(0, 0, 1)

        this.uPositionsMat = program.uniform("positionsMat");
        this.uNormalsMat = program.uniform("normalsMat");
        this.uProjectionMat = program.uniform("projectionMat");

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

        this.lightPositionTarget().value = inputs.lightPosition
        this.lightRadiusTarget().value = inputs.lightRadius
        this.colorTarget().value = inputs.color
        this.shininessTarget().value = inputs.shininess
        this.fogginessTarget().value = inputs.fogginess
        this.modelMatrixTarget().value = inputs.matModel
        this.viewMatrixTarget().value = inputs.matView
        this.modelUriTarget().value = modelUri

    }

    modelMatrixTarget(): gear.Target<aether.Mat<4>> {
        return new gear.Target(matrix => {
            this.modelMatrix = matrix
            this.draw()
        })
    }

    viewMatrixTarget(): gear.Target<aether.Mat<4>> {
        return new gear.Target(matrix => {
            this.viewMatrix = matrix
            this.draw()
        })
    }

    modelUriTarget(): gear.Target<string> {
        return new gear.Target(async (modelUri) => {
            const renderer = new wgl.GLRenderer(this.context, {
                "POSITION" : this.position,
                "NORMAL" : this.normal,
            }, this.uPositionsMat, this.uNormalsMat)
            if (this.model) {
                this.model.delete()
                this.model = null
            }
            this.model = await gltf.ActiveModel.create(modelUri, renderer)
            this.draw()
        })
    }

    lightPositionTarget(): gear.Target<aether.Vec3> {
        return new gear.Target(lightPosition => {
            this.uLightPosition.data = lightPosition
            this.draw();
        })
    }

    lightRadiusTarget(): gear.Target<number> {
        return new gear.Target(value => {
            this.uLightRadius.data = [value];
            this.draw();
        })
    }

    shininessTarget(): gear.Target<number> {
        return new gear.Target(value => {
            this.uShininess.data = [value];
            this.draw();
        })
    }

    colorTarget(): gear.Target<aether.Vec4> {
        return new gear.Target(color => {
            this.uColor.data = color;
            this.draw();
        });
    }

    fogginessTarget(): gear.Target<number> {
        return new gear.Target(value => {
            this.uFogginess.data = [value];
            this.draw();
        })
    }

    draw() {
        const gl = this.context.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (this.model) {
            this.model.render(aether.mat4.mul(this.viewMatrix, this.modelMatrix))
        }
        gl.flush();
    }

}
