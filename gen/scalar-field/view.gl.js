var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as Djee from "../djee/all.js";
import * as Gear from "../gear/all.js";
import { mat4 } from "../../ether/latest/index.js";
import * as v from "./view.js";
export class GLView {
    constructor(canvasId, vertexShaderCode, fragmentShaderCode) {
        this._frame = null;
        this._matPositions = mat4.identity();
        this._matNormals = mat4.identity();
        this._matView = mat4.identity();
        this._globalLightPosition = [2, 2, 2, 1];
        this.context = Djee.Context.of(canvasId);
        this.program = this.context.link(this.context.vertexShader(vertexShaderCode), this.context.fragmentShader(fragmentShaderCode));
        this.program.use();
        this.position = this.program.attribute("position");
        this.normal = this.program.attribute("normal");
        this._matModelPositions = this.program.uniform("positionsMat");
        this._matModelNormals = this.program.uniform("normalsMat");
        this._matProjection = this.program.uniform("projectionMat");
        this._color = this.program.uniform("color");
        this._shininess = this.program.uniform("shininess");
        this._lightPosition = this.program.uniform("lightPosition");
        this._lightRadius = this.program.uniform("lightRadius");
        this._fogginess = this.program.uniform("fogginess");
        this._matModelPositions.data = mat4.columnMajorArray(mat4.identity());
        this._matModelNormals.data = mat4.columnMajorArray(mat4.identity());
        this._matView = mat4.identity();
        this._matProjection.data = mat4.columnMajorArray(mat4.identity());
        this._color.data = [0.2, 0.4, 0.8, 1.0];
        this._shininess.data = [0.5];
        this._globalLightPosition = [2, 2, 2, 1];
        this._lightPosition.data = [2, 2, 2];
        this._lightRadius.data = [0.1];
        this._fogginess.data = [0.1];
        const gl = this.context.gl;
        this._vertices = this.context.newAttributesBuffer(6 * 4, true);
        this._primitives = gl.TRIANGLES;
        this.position.pointTo(this._vertices);
        this.normal.pointTo(this._vertices, 3 * 4);
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1);
        gl.clearColor(1, 1, 1, 1);
    }
    setMatModel(modelPositions, modelNormals = mat4.transpose(mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions;
        this._matNormals = modelNormals;
        this._matModelPositions.data = mat4.columnMajorArray(mat4.mul(this._matView, modelPositions));
        this._matModelNormals.data = modelPositions === modelNormals ?
            this._matModelPositions.data :
            mat4.columnMajorArray(mat4.mul(this._matView, modelNormals));
    }
    get matPositions() {
        return this._matPositions;
    }
    get matNormals() {
        return this._matNormals;
    }
    get matView() {
        return this._matView;
    }
    set matView(m) {
        this._matView = m;
        this.lightPosition = this._globalLightPosition;
    }
    get matProjection() {
        return v.asMat(this._matProjection.data);
    }
    set matProjection(m) {
        this._matProjection.data = mat4.columnMajorArray(m);
    }
    get color() {
        return v.asVec(this._color.data);
    }
    set color(c) {
        this._color.data = c;
    }
    get shininess() {
        return this._shininess.data[0];
    }
    set shininess(s) {
        this._shininess.data = [s];
    }
    get lightPosition() {
        return this._globalLightPosition;
    }
    set lightPosition(p) {
        this._globalLightPosition = p;
        this._lightPosition.data = mat4.apply(this._matView, p).slice(0, 3);
    }
    get lightRadius() {
        return this._lightRadius.data[0];
    }
    set lightRadius(s) {
        this._lightRadius.data = [s];
    }
    get fogginess() {
        return this._fogginess.data[0];
    }
    set fogginess(f) {
        this._fogginess.data = [f];
    }
    setMesh(primitives, vertices) {
        this._primitives = primitives;
        this._vertices.data = vertices;
        if (!this._frame) {
            this._frame = () => {
                const gl = this.context.gl;
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.drawArrays(this._primitives, 0, this._vertices.data.length / 6);
                if (this._frame) {
                    requestAnimationFrame(this._frame);
                }
                gl.flush();
            };
            this._frame();
        }
    }
}
export function newView(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield Gear.fetchFiles({
            vertexShader: "generic.vert",
            fragmentShader: "generic.frag"
        }, "/shaders");
        return new GLView(canvasId, shaders.vertexShader, shaders.fragmentShader);
    });
}
//# sourceMappingURL=view.gl.js.map