import * as Djee from "../djee/all.js";
import * as Gear from "../gear/all.js";
import { mat4, vec2, vec3 } from "../../ether/latest/index.js";
export class Renderer {
    constructor(vertexShaderCode, fragmentShaderCode, matrices) {
        this.translationUp = mat4.translation([0, +2, 0]);
        this.translationDown = mat4.translation([0, -2, 0]);
        this.view = mat4.lookAt([-1, 4, 5], [0, 3, 0], [0, 1, 0]);
        this.treeView = mat4.mul(this.view, this.translationUp);
        this.proj = mat4.projection();
        this.context = Djee.Context.of("canvas-gl");
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
        const model = mat4.identity();
        this.matModel.data = mat4.columnMajorArray(model);
        this.matView.data = mat4.columnMajorArray(this.view);
        this.matProjection.data = mat4.columnMajorArray(this.proj);
        this.lightPosition = program.uniform("lightPosition");
        this.color = program.uniform("color");
        this.shininess = program.uniform("shininess");
        this.fogginess = program.uniform("fogginess");
        this.twist = program.uniform("twist");
        this.lightPosition.data = [8, 8, 8];
        this.color.data = [0.3, 0.5, 0.7];
        this.shininess.data = [0.0];
        this.fogginess.data = [0.0];
        this.twist.data = [0.0];
        this.matrices = matrices;
        this.draw();
    }
    matricesSink() {
        return Gear.sink(matrices => {
            if (matrices) {
                this.matrices = matrices;
                this.draw();
            }
        });
    }
    rotationSink() {
        return Gear.sinkFlow(flow => flow.defaultsTo(mat4.identity()).producer(matrix => {
            this.matModel.data = mat4.columnMajorArray(mat4.mul(this.translationUp, mat4.mul(matrix, this.translationDown)));
            this.draw();
        }));
    }
    lightPositionSink() {
        return Gear.sinkFlow(flow => flow
            .defaultsTo([0.5, 0.5])
            .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
            .producer(([x, y]) => {
            this.lightPosition.data = [8 * Math.sin(x) * Math.cos(y), 8 * Math.sin(y), 8 * Math.cos(x) * Math.cos(y)];
            this.draw();
        }));
    }
    colorSink() {
        const redVec = [1, 0];
        const greenVec = [Math.cos(2 * Math.PI / 3), Math.sin(2 * Math.PI / 3)];
        const blueVec = [Math.cos(4 * Math.PI / 3), Math.sin(4 * Math.PI / 3)];
        return Gear.sinkFlow(flow => flow
            .defaultsTo([-0.4, -0.2])
            .producer(vec => {
            const red = Math.min(2, 1 + vec2.dot(vec, redVec)) / 2;
            const green = Math.min(2, 1 + vec2.dot(vec, greenVec)) / 2;
            const blue = Math.min(2, 1 + vec2.dot(vec, blueVec)) / 2;
            this.color.data = [red, green, blue];
            this.draw();
        }));
    }
    shininessSink() {
        return Gear.sink(shininess => {
            this.shininess.data = [shininess];
            this.draw();
        });
    }
    fogginessSink() {
        return Gear.sink(fogginess => {
            this.fogginess.data = [fogginess];
            this.draw();
        });
    }
    twistSink() {
        return Gear.sink(twist => {
            this.twist.data = [twist];
            this.draw();
        });
    }
    draw() {
        const gl = this.context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        for (let matrix of this.matrices) {
            this.matSubModel.data = matrix;
            for (let y = 0; y < 16; y++) {
                gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, y * 34, 34);
            }
        }
        gl.flush();
    }
    vertexData() {
        const result = [];
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
                const n = vec3.unit([x, r * d, z]);
                result.push(2 * x * r2, 2 * y2, 2 * z * r2, ...n, 2 * x * r1, 2 * y1, 2 * z * r1, ...n);
            }
        }
        return result;
    }
}
//# sourceMappingURL=renderer.js.map