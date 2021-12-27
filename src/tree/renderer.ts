import { aether, gear } from "/gen/libs.js"
import { wgl } from "../djee/index.js"

type RendererInputs = {
    matrices: gear.Value<aether.Mat<4>[]>
    rotation: gear.Value<aether.Mat<4>>
    lightPosition: gear.Value<aether.Vec<3>>
    color: gear.Value<[hue: number, saturation: number]>
    shininess: gear.Value<number>
    fogginess: gear.Value<number>
    twist: gear.Value<number>
}

export class Renderer {

    private context: wgl.Context;
    private buffer: wgl.AttributesBuffer;
    
    private matModel: wgl.Uniform;
    private matSubModel: wgl.Uniform;
    private matView: wgl.Uniform;
    private matProjection: wgl.Uniform;

    private lightPosition: wgl.Uniform;
    private color: wgl.Uniform;
    private shininess: wgl.Uniform;
    private fogginess: wgl.Uniform;
    private twist: wgl.Uniform;

    private matrices: number[][];
    private lastTime: number = performance.now()

    private translationDown = aether.mat4.translation([0, -2, 0]);

    constructor(vertexShaderCode: string, fragmentShaderCode: string, readonly proj: aether.Mat<4>, readonly view: aether.Mat<4>, inputSuppliers: gear.Supplier<RendererInputs>) {
        const inputs = inputSuppliers()
        this.context = wgl.Context.of("canvas-gl");

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

        this.matView.data = aether.mat4.columnMajorArray(this.view);
        this.matProjection.data = aether.mat4.columnMajorArray(this.proj);
        this.matrices = [];

        inputs.matrices.attach(matrices => {
            this.matrices = matrices.map(m => aether.mat4.columnMajorArray(m))
        })

        inputs.rotation.map(toMat3).defaultsTo(aether.mat3.identity()).attach(matrix => {
            this.matModel.data = aether.mat4.columnMajorArray(aether.mat4.translated(matrix, [0, +2, 0]))
        })

        inputs.lightPosition.defaultsTo(aether.vec3.of(4, 4, 4)).attach(pos => {
            this.lightPosition.data = pos
        })

        const redVec: aether.Vec<2> = [1, 0];
        const greenVec: aether.Vec<2> = [Math.cos(2 * Math.PI / 3), Math.sin(2 * Math.PI / 3)];
        const blueVec: aether.Vec<2> = [Math.cos(4 * Math.PI / 3), Math.sin(4 * Math.PI / 3)];
        inputs.color.defaultsTo([0.55, 0.8]).attach(([hue, saturation]) => {
            const hueAngle = 2 * Math.PI * hue;
            const hueVec = aether.vec2.of(Math.cos(hueAngle), Math.sin(hueAngle))
            const red = (aether.vec2.dot(redVec, hueVec) + 1) / 2
            const green = (aether.vec2.dot(greenVec, hueVec) + 1) / 2
            const blue = (aether.vec2.dot(blueVec, hueVec) + 1) / 2
            const max = Math.max(red, green, blue)
            this.color.data = aether.vec3.mix(saturation, [red / max, green / max, blue / max], [1, 1, 1])
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
function toMat3(matrix: aether.Mat<4>) {
    const vs = matrix.map(v => aether.vec3.swizzle(v, 0, 1, 2));
    const m: aether.Mat<3> = [vs[0], vs[1], vs[2]];
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

            const n = aether.vec3.unit([x, slope, z]);
            result.push(
                x * r2, y2, z * r2, ...n,
                x * r1, y1, z * r1, ...n
            );
        }
    }
    return result;
}

export async function renderer(proj: aether.Mat<4>, view: aether.Mat<4>, inputSuppliers: gear.Supplier<RendererInputs>) {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "tree.vert",
        fragmentShaderCode: "tree.frag"
    }, "/shaders")
    return new Renderer(shaders.vertexShaderCode, shaders.fragmentShaderCode, proj, view, inputSuppliers)
}