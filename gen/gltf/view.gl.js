var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether, gear } from "/gen/libs.js";
import { wgl, gltf } from "../djee/index.js";
export class GLView {
    constructor(canvasId, vertexShaderCode, fragmentShaderCode, inputs, modelUri) {
        this.model = null;
        this.viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
        this.modelMatrix = aether.mat4.identity();
        this.projectionMatrix = aether.mat4.projection(2);
        const shaders = {
            vertexShaderCode,
            fragmentShaderCode
        };
        this.context = wgl.Context.of(canvasId);
        const program = this.context.link(this.context.vertexShader(shaders.vertexShaderCode), this.context.fragmentShader(shaders.fragmentShaderCode));
        program.use();
        this.position = program.attribute("position");
        this.normal = program.attribute("normal");
        this.normal.setTo(0, 0, 1);
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
        this.lightPositionTarget().value = inputs.lightPosition;
        this.lightRadiusTarget().value = inputs.lightRadius;
        this.colorTarget().value = inputs.color;
        this.shininessTarget().value = inputs.shininess;
        this.fogginessTarget().value = inputs.fogginess;
        this.modelMatrixTarget().value = inputs.matModel;
        this.viewMatrixTarget().value = inputs.matView;
        this.modelUriTarget().value = modelUri;
    }
    modelMatrixTarget() {
        return new gear.Target(matrix => {
            this.modelMatrix = matrix;
            this.draw();
        });
    }
    viewMatrixTarget() {
        return new gear.Target(matrix => {
            this.viewMatrix = matrix;
            this.draw();
        });
    }
    modelUriTarget() {
        return new gear.Target((modelUri) => __awaiter(this, void 0, void 0, function* () {
            const renderer = new wgl.GLRenderer(this.context, {
                "POSITION": this.position,
                "NORMAL": this.normal,
            }, this.uPositionsMat, this.uNormalsMat);
            if (this.model) {
                this.model.delete();
                this.model = null;
            }
            this.model = yield gltf.ActiveModel.create(modelUri, renderer);
            this.draw();
        }));
    }
    lightPositionTarget() {
        return new gear.Target(lightPosition => {
            this.uLightPosition.data = lightPosition;
            this.draw();
        });
    }
    lightRadiusTarget() {
        return new gear.Target(value => {
            this.uLightRadius.data = [value];
            this.draw();
        });
    }
    shininessTarget() {
        return new gear.Target(value => {
            this.uShininess.data = [value];
            this.draw();
        });
    }
    colorTarget() {
        return new gear.Target(color => {
            this.uColor.data = color;
            this.draw();
        });
    }
    fogginessTarget() {
        return new gear.Target(value => {
            this.uFogginess.data = [value];
            this.draw();
        });
    }
    draw() {
        const gl = this.context.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (this.model) {
            this.model.render(aether.mat4.mul(this.viewMatrix, this.modelMatrix));
        }
        gl.flush();
    }
}
//# sourceMappingURL=view.gl.js.map