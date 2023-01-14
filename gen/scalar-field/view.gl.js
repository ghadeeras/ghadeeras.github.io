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
import { wgl } from "../djee/index.js";
import { picker } from "./picker.gl.js";
const projection = new aether.PerspectiveProjection(1, null, false, true);
export class GLView {
    constructor(canvasId, vertexShaderCode, fragmentShaderCode) {
        this._matPositions = aether.mat4.identity();
        this._matNormals = aether.mat4.identity();
        this._matView = aether.mat4.identity();
        this._globalLightPosition = [2, 2, 2, 1];
        this._focalLength = 2;
        this._aspectRatio = 1;
        this.context = wgl.Context.of(canvasId);
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
        this._matModelPositions.data = aether.mat4.columnMajorArray(aether.mat4.identity());
        this._matModelNormals.data = aether.mat4.columnMajorArray(aether.mat4.identity());
        this._matView = aether.mat4.identity();
        this._matProjection.data = aether.mat4.columnMajorArray(aether.mat4.identity());
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
        this.bind();
        this._frame = () => {
            const gl = this.context.gl;
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.drawArrays(this._primitives, 0, this._vertices.data.length / 6);
            gl.flush();
            requestAnimationFrame(this._frame);
        };
        this._frame();
    }
    picker() {
        return picker(this, () => this._vertices);
    }
    bind() {
        this.program.use();
        const gl = this.context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1);
        gl.clearColor(1, 1, 1, 1);
    }
    setMatModel(modelPositions, modelNormals = aether.mat4.transpose(aether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions;
        this._matNormals = modelNormals;
        this._matModelPositions.data = aether.mat4.columnMajorArray(aether.mat4.mul(this._matView, modelPositions));
        this._matModelNormals.data = modelPositions === modelNormals ?
            this._matModelPositions.data :
            aether.mat4.columnMajorArray(aether.mat4.mul(this._matView, modelNormals));
    }
    resize() {
        this._aspectRatio = this.context.canvas.width / this.context.canvas.height;
        this.matProjection = projection.matrix(this._focalLength, this._aspectRatio);
        this.context.gl.viewport(0, 0, this.context.canvas.width, this.context.canvas.height);
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
    get focalLength() {
        return this._focalLength;
    }
    set focalLength(l) {
        this._focalLength = l;
        this.matProjection = projection.matrix(this._focalLength, this._aspectRatio);
    }
    get matProjection() {
        return aether.mat4.from(this._matProjection.data);
    }
    set matProjection(m) {
        this._matProjection.data = aether.mat4.columnMajorArray(m);
    }
    get color() {
        return aether.vec4.from(this._color.data);
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
        this._lightPosition.data = aether.vec4.add(this._matView[3], p).slice(0, 3);
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
    }
}
export function newView(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield gear.fetchTextFiles({
            vertexShader: "generic.vert",
            fragmentShader: "generic.frag"
        }, "/shaders");
        return new GLView(canvasId, shaders.vertexShader, shaders.fragmentShader);
    });
}
//# sourceMappingURL=view.gl.js.map