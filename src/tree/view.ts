import * as aether from 'aether';
import * as gear from 'gear';
import { wgl } from "lumen"

export class View {

    private context: wgl.Context;
    private buffer: wgl.AttributesBuffer;
    
    private _projectionMatrix: wgl.Uniform;
    private _viewMatrix: wgl.Uniform;
    private _modelMatrix: wgl.Uniform;

    private _lightPosition: wgl.Uniform;
    private _color: wgl.Uniform;
    private _shininess: wgl.Uniform;
    private _fogginess: wgl.Uniform;
    private _twist: wgl.Uniform;

    private matSubModelUniform: wgl.Uniform;
    private _matrices: number[][];

    constructor(canvasId: string, vertexShaderCode: string, fragmentShaderCode: string) {
        this.context = wgl.Context.of(canvasId);

        this.buffer = this.context.newAttributesBuffer(6 * 4);
        this.buffer.float32Data = this.vertexData();

        const vertexShader = this.context.vertexShader(vertexShaderCode);
        const fragmentShader = this.context.fragmentShader(fragmentShaderCode);
        const program = this.context.link(vertexShader, fragmentShader);
        program.use();

        const position = program.attribute("position");
        const normal = program.attribute("normal");
        position.pointTo(this.buffer, 0 * this.buffer.word);
        normal.pointTo(this.buffer, 3 * this.buffer.word);

        this._projectionMatrix = program.uniform("matProjection");
        this._viewMatrix = program.uniform("matView");
        this._modelMatrix = program.uniform("matModel");
        this.matSubModelUniform = program.uniform("matSubModel");

        this._lightPosition = program.uniform("lightPosition");
        this._color = program.uniform("color");
        this._shininess = program.uniform("shininess");
        this._fogginess = program.uniform("fogginess");
        this._twist = program.uniform("twist");

        this.projectionMatrix = aether.mat4.projection(2);
        this.viewMatrix = aether.mat4.lookAt([-1, 2, 10], [0, 1, 0]);
        this.modelMatrix = aether.mat4.identity();
        this._matrices = [];

        this.color = [0.8, 0.8, 0.8];
        this.lightPosition = [-8, 8, 8];
        this.twist = 0;
        this.shininess = 1;
        this.fogginess = 0;
    }

    private vertexData(): number[] {
        const d = 2 * (1 - Math.SQRT1_2) / (1 + Math.SQRT1_2);
        const radiusBottom = (1 + d / 2) / 4;
        const radiusTop = (1 - d / 2) / 4;
        const height = 2
        const stacks = 8;
        const slices = 12;
        return cone(radiusTop, radiusBottom, height, stacks, slices);
    }

    draw() {
        const gl = this.context.gl;
        gl.enable(gl.DEPTH_TEST);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const matrix of this._matrices) {
            this.matSubModelUniform.data = matrix;
            gl.drawArrays(WebGL2RenderingContext.TRIANGLE_STRIP, 0, this.buffer.data.byteLength / (6 * 4));
        }
        
        gl.flush();
    }

    resize() {
        const scale = this.projectionMatrix[1][1];
        this.projectionMatrix = aether.mat4.projection(scale, 1, 128, this.context.canvas.width / this.context.canvas.height);
        this.context.gl.viewport(0, 0, this.context.canvas.width, this.context.canvas.height);
    }

    get projectionMatrix(): aether.Mat4 {
        return aether.mat4.from(this._projectionMatrix.data);
    }

    set projectionMatrix(value: aether.Mat4) {
        this._projectionMatrix.data = aether.mat4.columnMajorArray(value);
    }

    get viewMatrix(): aether.Mat4 {
        return aether.mat4.from(this._viewMatrix.data);
    }

    set viewMatrix(value: aether.Mat4) {
        this._viewMatrix.data = aether.mat4.columnMajorArray(value);
    }

    get modelMatrix(): aether.Mat4 {
        return aether.mat4.from(this._modelMatrix.data);
    }

    set modelMatrix(value: aether.Mat4) {
        this._modelMatrix.data = aether.mat4.columnMajorArray(value);
    }

    get matrices(): aether.Mat4[] {
        return this._matrices.map(m => aether.mat4.from(m));
    }

    set matrices(value: aether.Mat4[]) {
        this._matrices = value.map(m => aether.mat4.columnMajorArray(m));
    }

    get color(): aether.Vec3 {
        return aether.vec3.from(this._color.data);
    }

    set color(value: aether.Vec3) {
        this._color.data = value;
    }

    get lightPosition(): aether.Vec3 {
        return aether.vec3.from(this._lightPosition.data);
    }

    set lightPosition(value: aether.Vec3) {
        this._lightPosition.data = value;
    }

    get twist(): number {
        return this._twist.data[0]
    }

    set twist(value: number) {
        this._twist.data = [value];
    }

    get shininess(): number {
        return this._shininess.data[0];
    }

    set shininess(value: number) {
        this._shininess.data = [value];
    }

    get fogginess(): number {
        return this._fogginess.data[0];
    }

    set fogginess(value: number) {
        this._fogginess.data = [value];
    }

}

function cone(radiusTop: number, radiusBottom: number, height: number, stacks: number, slices: number) {
    const slope = (radiusTop - radiusBottom) / height;
    const result: number[] = [];
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j <= slices; j++) {
            const y1 = height * (i / stacks);
            const y2 = height * ((i + 1) / stacks);
            const r1 = radiusBottom + slope * y1;
            const r2 = radiusBottom + slope * y2;
            const z = Math.cos(2 * Math.PI * j / slices);
            const x = Math.sin(2 * Math.PI * j / slices);

            const n = aether.vec3.unit([x, slope, z]);
            result.push(
                x * r2, y2, z * r2, ...n,
                x * r1, y1, z * r1, ...n
            );
        }
    }
    return result;
}

export async function view(canvasId: string) {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "tree.vert",
        fragmentShaderCode: "tree.frag"
    }, "/shaders")
    return new View(canvasId, shaders.vertexShaderCode, shaders.fragmentShaderCode);
}