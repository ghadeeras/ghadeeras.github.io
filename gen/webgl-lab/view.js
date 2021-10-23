import * as gear from "../../gear/latest/index.js";
import * as djee from "../djee/all.js";
import { values } from "../djee/utils.js";
export class View {
    constructor(canvasId, samples, inputs) {
        this.program = null;
        this.lod = 50;
        this.mode = WebGLRenderingContext.TRIANGLE_STRIP;
        this.cullingEnabled = false;
        this.programScalars = [];
        this.xScalar = null;
        this.yScalar = null;
        setOptions("shader-sample", options(samples));
        this.context = djee.Context.of(canvasId);
        this.buffer = this.context.newAttributesBuffer();
        this.defaultSample = samples[0];
        inputs.mesh
            .defaultsTo(false)
            .then(gear.choice(WebGLRenderingContext.LINE_STRIP, WebGLRenderingContext.TRIANGLE_STRIP))
            .attach(mode => {
            this.mode = mode;
            this.draw();
        });
        gear.text("lod").value = inputs.levelOfDetails
            .defaultsTo(this.lod)
            .filter(lod => lod > 0 && lod <= 100)
            .attach(lod => this.resetBuffer(lod))
            .map(lod => (lod + 1000).toString().substring(1));
        inputs.program
            .defaultsTo(this.defaultSample)
            .map(shaders => this.recompile(shaders))
            .map(program => this.reflectOn(program))
            .map(reflection => this.programScalars = this.toScalars(reflection))
            .attach(scalars => {
            this.draw();
            setOptions("mouse-x", [noneOption(), ...options(scalars)]);
            setOptions("mouse-y", [noneOption(), ...options(scalars)]);
        });
        const programSample = inputs.programSample.defaultsTo(this.defaultSample);
        gear.writeableValue("vertex-shader").value = programSample.map(template => template.vertexShader);
        gear.writeableValue("fragment-shader").value = programSample.map(template => template.fragmentShader);
        const mouseXY = inputs.mouseXY.defaultsTo([0, 0]);
        gear.text("mouse-x-val").value = gear.Value.from(inputs.mouseXBinding
            .defaultsTo(0)
            .map(index => this.xScalar = index >= 0 ? this.programScalars[index] : null)
            .map(scalar => scalar != null ? scalar.uniform.data[scalar.index].toPrecision(3) : ""), mouseXY
            .map(([x, y]) => this.xScalar != null ? x.toPrecision(3) : ""));
        gear.text("mouse-y-val").value = gear.Value.from(inputs.mouseYBinding
            .defaultsTo(0)
            .map(index => this.yScalar = index >= 0 ? this.programScalars[index] : null)
            .map(scalar => scalar != null ? round3(scalar.uniform.data[scalar.index]).toString() : ""), mouseXY
            .map(([x, y]) => this.yScalar != null ? y.toPrecision(3) : ""));
        mouseXY.attach(([x, y]) => {
            this.setValue(this.xScalar, x);
            this.setValue(this.yScalar, y);
            this.draw();
        });
    }
    recompile(shaders) {
        if (this.program != null) {
            this.program.delete();
        }
        this.program = this.context.link(this.context.vertexShader(shaders.vertexShader), this.context.fragmentShader(shaders.fragmentShader));
        this.program.use();
        return this.program;
    }
    setValue(scalar, value) {
        if (scalar != null) {
            const data = scalar.uniform.data;
            data[scalar.index] = value;
            scalar.uniform.data = data;
        }
    }
    reflectOn(program) {
        return {
            program: program,
            attributes: values(program.attributeInfos).filter(attribute => attribute.itemCount == 1),
            uniforms: values(program.uniformInfos).filter(uniform => uniform.itemCount == 1)
        };
    }
    toScalars(reflection) {
        const result = [];
        for (let attribute of reflection.attributes) {
            const glAttribute = reflection.program.attribute(attribute.name);
            glAttribute.pointTo(this.buffer);
        }
        for (let uniform of reflection.uniforms) {
            const dimensions = uniform.itemDimensions;
            const glUniform = reflection.program.uniform(uniform.name);
            const data = [];
            for (let j = 0; j < dimensions; j++) {
                const scalar = {
                    uniform: glUniform,
                    index: j,
                    name: uniform.name + (dimensions > 1 ? "[" + j + "]" : "")
                };
                data.push(0);
                result.push(scalar);
            }
            glUniform.data = data;
        }
        return result.sort((s1, s2) => {
            const sizeComparison = s1.uniform.info.itemSize - s2.uniform.info.itemSize;
            return sizeComparison != 0 ? sizeComparison : s1.name.localeCompare(s2.name);
        });
    }
    resetBuffer(lod) {
        const data = [];
        for (let y = 0; y < lod; y++) {
            for (let x = 0; x <= lod; x++) {
                data.push(2 * x / lod - 1.0, 2 * (y + 1) / lod - 1.0);
                data.push(2 * x / lod - 1.0, 2 * y / lod - 1.0);
            }
        }
        this.lod = lod;
        this.buffer.float32Data = data;
        this.draw();
    }
    draw() {
        if (this.program) {
            const gl = this.context.gl;
            gl.frontFace(gl.CCW);
            gl.cullFace(gl.BACK);
            gl.enable(gl.DEPTH_TEST);
            if (this.cullingEnabled) {
                gl.enable(gl.CULL_FACE);
            }
            else {
                gl.disable(gl.CULL_FACE);
            }
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            const rowVertexCount = 2 * (this.lod + 1);
            for (let y = 0; y < this.lod; y++) {
                gl.drawArrays(this.mode, y * rowVertexCount, rowVertexCount);
            }
        }
    }
}
function setOptions(elementId, options) {
    const element = document.getElementById(elementId);
    element.innerHTML = "";
    options.forEach(option => element.add(option));
}
function options(values) {
    return values.map((value, i) => new Option(value.name, i.toString()));
}
function noneOption() {
    return new Option("NONE", "-1");
}
function round3(n) {
    return Math.round(n * 1000) / 1000;
}
//# sourceMappingURL=view.js.map