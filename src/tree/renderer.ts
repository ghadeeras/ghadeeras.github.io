import * as Space from "../space/all.js"
import * as Djee from "../djee/all.js"
import * as Gear from "../gear/all.js"
import { View } from "../mandelbrot/view.js";

export class Renderer {

    private context: Djee.Context;
    private buffer: Djee.Buffer;
    
    private matModel: Djee.Uniform;
    private matSubModel: Djee.Uniform;
    private matView: Djee.Uniform;
    private matProjection: Djee.Uniform;

    private lightPosition: Djee.Uniform;
    private color: Djee.Uniform;
    private shininess: Djee.Uniform;
    private fogginess: Djee.Uniform;
    private twist: Djee.Uniform;

    private matrices: number[][];

    private translationUp = Space.Matrix.translation(0, +2, 0);
    private translationDown = Space.Matrix.translation(0, -2, 0);
    readonly view = Space.Matrix.globalView(Space.vec(0, 4, 9), Space.vec(0, 3, 0), Space.vec(0, 1, 0));
    readonly treeView = this.view.by(this.translationUp);
    readonly proj = Space.Matrix.project(1, 100, 1);

    constructor(vertexShaderCode: string, fragmentShaderCode: string, matrices: number[][]) {
        this.context = new Djee.Context("canvas-gl");
        this.buffer = this.context.newBuffer();
        this.buffer.untypedData = this.vertexData();

        const vertexShader = this.context.vertexShader(vertexShaderCode);
        const fragmentShader = this.context.fragmentShader(fragmentShaderCode);
        const program = this.context.link([vertexShader, fragmentShader]);
        program.use();

        const position = program.locateAttribute("position", 3);
        const normal = program.locateAttribute("normal", 3);
        position.pointTo(this.buffer, 6, 0);
        normal.pointTo(this.buffer, 6, 3);

        this.matModel = program.locateUniform("matModel", 4, true);
        this.matSubModel = program.locateUniform("matSubModel", 4, true);
        this.matView = program.locateUniform("matView", 4, true);
        this.matProjection = program.locateUniform("matProjection", 4, true);

        const model = Space.Matrix.identity();
        this.matModel.data = model.asColumnMajorArray;
        this.matView.data = this.view.asColumnMajorArray;
        this.matProjection.data = this.proj.asColumnMajorArray;

        this.lightPosition = program.locateUniform("lightPosition", 3, false);
        this.color = program.locateUniform("color", 3, false);
        this.shininess = program.locateUniform("shininess", 1, false);
        this.fogginess = program.locateUniform("fogginess", 1, false);
        this.twist = program.locateUniform("twist", 1, false);

        this.lightPosition.data = [8, 8, 8];
        this.color.data = [0.3, 0.5, 0.7]
        this.shininess.data = [0.0];
        this.fogginess.data = [0.0];
        this.twist.data = [0.0];

        this.matrices = matrices;
        this.draw();
    }
    
    matricesSink(): Gear.Sink<number[][]> {
        return Gear.sink(matricies => {
            if (matricies) {
                this.matrices = matricies;
                this.draw();
            }
        });
    }

    rotationSink(): Gear.Sink<Space.Matrix> {
        return Gear.sinkFlow(flow => flow.defaultsTo(Space.Matrix.identity()).producer(matrix => {
            this.matModel.data = this.translationUp
                .by(matrix)
                .by(this.translationDown)
                .asColumnMajorArray;
            this.draw();
        }));
    }

    lightPositionSink(): Gear.Sink<Gear.PointerPosition> {
        return Gear.sinkFlow(flow => flow
            .defaultsTo([0.5, 0.5])
            .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
            .producer(([x, y]) => {
            this.lightPosition.data = [8 * Math.sin(x) * Math.cos(y), 8 * Math.sin(y), 8 * Math.cos(x) * Math.cos(y)];
            this.draw();
        }));
    }

    colorSink(): Gear.Sink<Gear.PointerPosition> {
        const redVec = Space.vec(1, 0);
        const greenVec = Space.vec(Math.cos(2 * Math.PI / 3), Math.sin(2 * Math.PI / 3));
        const blueVec = Space.vec(Math.cos(4 * Math.PI / 3), Math.sin(4 * Math.PI / 3));
        return Gear.sinkFlow(flow => flow
            .defaultsTo([-0.4, -0.2])
            .map(([x, y]) => Space.vec(x, y))
            .producer(vec => {
            const red = Math.min(2, 1 + vec.dot(redVec)) / 2;
            const green = Math.min(2, 1 + vec.dot(greenVec)) / 2;
            const blue = Math.min(2, 1 + vec.dot(blueVec)) / 2;
            this.color.data = [red, green, blue];
            this.draw();
        }));
    }

    shininessSink(): Gear.Sink<number> {
        return Gear.sink(shininess => {
            this.shininess.data = [shininess];
            this.draw();
        });
    }
    
    fogginessSink(): Gear.Sink<number> {
        return Gear.sink(fogginess => {
            this.fogginess.data = [fogginess];
            this.draw();
        });
    }
    
    twistSink(): Gear.Sink<number> {
        return Gear.sink(twist => {
            this.twist.data = [twist];
            this.draw();
        });
    }
    
    private draw() {
        const gl = this.context.gl;
        gl.enable(gl.DEPTH_TEST);

        // gl.enable(gl.CULL_FACE);
        // gl.frontFace(gl.CCW);
        // gl.cullFace(gl.BACK);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let matrix of this.matrices) {
            this.matSubModel.data = matrix;
            for (let y = 0; y < 16; y++) {
                gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, y * 34, 34);
            }
        }
        
        gl.finish()
        gl.flush();
    }

    private vertexData(): number[] {
        const result: number[] = [];
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j <= 16; j++) {
                const y1 = i / 16; 
                const y2 = (i + 1) / 16;
                const z = Math.cos(Math.PI * j / 8); 
                const x = Math.sin(Math.PI * j / 8);

                const r = 1 / 8;
                const d = 2 * (1 - Math.SQRT1_2) / (1 + Math.SQRT1_2);
                const r1 = r * (1 - d * (y1 - 0.5));
                const r2 = r * (1 - d * (y2 - 0.5));

                const n = Space.vec(x, r * d, z).unit;
                
                result.push(
                    2 * x * r2, 2 * y2, 2 * z * r2, ...n.coordinates,
                    2 * x * r1, 2 * y1, 2 * z * r1, ...n.coordinates, 
                );
            }
        }
        return result;
    }

}
