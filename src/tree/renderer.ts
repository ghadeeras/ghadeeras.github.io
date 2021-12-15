import * as gear from "gear"
import * as ether from "ether";
import * as djee from "../djee/all.js"

type RendererInputs = {
    matrices: gear.Value<ether.Mat<4>[]>
    rotation: gear.Value<ether.Mat<4>>
    lightPosition: gear.Value<ether.Vec<3>>
    color: gear.Value<[hue: number, saturation: number]>
    shininess: gear.Value<number>
    fogginess: gear.Value<number>
    twist: gear.Value<number>
}

export class Renderer {

    private context: djee.Context;
    private buffer: djee.AttributesBuffer;
    
    private matModel: djee.Uniform;
    private matSubModel: djee.Uniform;
    private matView: djee.Uniform;
    private matProjection: djee.Uniform;

    private lightPosition: djee.Uniform;
    private color: djee.Uniform;
    private shininess: djee.Uniform;
    private fogginess: djee.Uniform;
    private twist: djee.Uniform;

    private matrices: number[][];
    private lastTime: number = performance.now()

    private translationDown = ether.mat4.translation([0, -2, 0]);

    constructor(vertexShaderCode: string, fragmentShaderCode: string, readonly proj: ether.Mat<4>, readonly view: ether.Mat<4>, inputSuppliers: gear.Supplier<RendererInputs>) {
        const inputs = inputSuppliers()
        this.context = djee.Context.of("canvas-gl");

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

        this.matModel = program.uniform("matModel");
        this.matSubModel = program.uniform("matSubModel");
        this.matView = program.uniform("matView");
        this.matProjection = program.uniform("matProjection");

        this.lightPosition = program.uniform("lightPosition");
        this.color = program.uniform("color");
        this.shininess = program.uniform("shininess");
        this.fogginess = program.uniform("fogginess");
        this.twist = program.uniform("twist");

        this.matView.data = ether.mat4.columnMajorArray(this.view);
        this.matProjection.data = ether.mat4.columnMajorArray(this.proj);
        this.matrices = [];

        inputs.matrices.attach(matrices => {
            this.matrices = matrices.map(m => ether.mat4.columnMajorArray(m))
        })

        inputs.rotation.map(toMat3).defaultsTo(ether.mat3.identity()).attach(matrix => {
            this.matModel.data = ether.mat4.columnMajorArray(ether.mat4.translated(matrix, [0, +2, 0]))
        })

        inputs.lightPosition.defaultsTo(ether.vec3.of(4, 4, 4)).attach(pos => {
            this.lightPosition.data = pos
        })

        const redVec: ether.Vec<2> = [1, 0];
        const greenVec: ether.Vec<2> = [Math.cos(2 * Math.PI / 3), Math.sin(2 * Math.PI / 3)];
        const blueVec: ether.Vec<2> = [Math.cos(4 * Math.PI / 3), Math.sin(4 * Math.PI / 3)];
        inputs.color.defaultsTo([0.55, 0.8]).attach(([hue, saturation]) => {
            const hueAngle = 2 * Math.PI * hue;
            const hueVec = ether.vec2.of(Math.cos(hueAngle), Math.sin(hueAngle))
            const red = (ether.vec2.dot(redVec, hueVec) + 1) / 2
            const green = (ether.vec2.dot(greenVec, hueVec) + 1) / 2
            const blue = (ether.vec2.dot(blueVec, hueVec) + 1) / 2
            const max = Math.max(red, green, blue)
            this.color.data = ether.vec3.mix(saturation, [red / max, green / max, blue / max], [1, 1, 1])
        })

        inputs.shininess.defaultsTo(0).attach(shininess => {
            this.shininess.data = [shininess]
        })

        inputs.fogginess.defaultsTo(0).attach(fogginess => {
            this.fogginess.data = [fogginess]
        })

        inputs.twist.defaultsTo(0).attach(twist => {
            this.twist.data = [twist]
        })

        this.animate(20);
    }

    private animate(maxFPS: number) {
        const minPeriod = 1000 / maxFPS;
        const frame = (time: number) => {
            const dT = time - this.lastTime;
            if (dT >= minPeriod) {
                this.draw();
                this.lastTime = time + (dT % minPeriod);
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }

    private draw() {
        const gl = this.context.gl;
        gl.enable(gl.DEPTH_TEST);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let matrix of this.matrices) {
            this.matSubModel.data = matrix;
            gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, 0, this.buffer.data.byteLength / (6 * 4));
        }
        
        gl.flush();
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

}
function toMat3(matrix: ether.Mat<4>) {
    const vs = matrix.map(v => ether.vec3.swizzle(v, 0, 1, 2));
    const m: ether.Mat<3> = [vs[0], vs[1], vs[2]];
    return m;
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

            const n = ether.vec3.unit([x, slope, z]);
            result.push(
                x * r2, y2, z * r2, ...n,
                x * r1, y1, z * r1, ...n
            );
        }
    }
    return result;
}

export async function renderer(proj: ether.Mat<4>, view: ether.Mat<4>, inputSuppliers: gear.Supplier<RendererInputs>) {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "tree.vert",
        fragmentShaderCode: "tree.frag"
    }, "/shaders")
    return new Renderer(shaders.vertexShaderCode, shaders.fragmentShaderCode, proj, view, inputSuppliers)
}