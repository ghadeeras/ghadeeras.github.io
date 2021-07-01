import * as Djee from "../djee/all.js";
import { values } from "../djee/utils.js";
import * as Gear from "../gear/all.js";
export class View {
    constructor(canvasId, samples) {
        this.program = null;
        this.lod = 50;
        this.mode = WebGLRenderingContext.TRIANGLE_STRIP;
        this.cullingEnabled = false;
        this.programScalars = [];
        this.xScalar = null;
        this.yScalar = null;
        setOptions("shader-sample", options(samples));
        this.context = Djee.Context.of(canvasId);
        this.buffer = this.context.newBuffer();
        this.defaultSample = samples[0];
    }
    get mesh() {
        return Gear.lazy(() => Gear.sinkFlow(flow => flow
            .defaultsTo(false)
            .then(Gear.choice(WebGLRenderingContext.LINE_STRIP, WebGLRenderingContext.TRIANGLE_STRIP))
            .producer(mode => {
            this.mode = mode;
            this.draw();
        })));
    }
    get levelOfDetail() {
        return Gear.lazy(() => Gear.sinkFlow(flow => flow
            .defaultsTo(this.lod)
            .filter(lod => lod > 0 && lod <= 100)
            .branch(flow => flow.to(Gear.sink(lod => this.resetBuffer(lod))), flow => flow.map(lod => (lod + 1000).toString().substring(1)).to(Gear.text("lod")))));
    }
    get compiler() {
        return Gear.lazy(() => Gear.sinkFlow(flow => flow
            .defaultsTo(this.defaultSample)
            .map(shaders => this.recompile(shaders))
            .map(program => this.reflectOn(program))
            .map(reflection => this.programScalars = this.toScalars(reflection))
            .branch(flow => flow.producer(scalars => this.draw()), flow => flow.producer(scalars => setOptions("mouse-x", [noneOption(), ...options(scalars)])), flow => flow.producer(scalars => setOptions("mouse-y", [noneOption(), ...options(scalars)])))));
    }
    get editor() {
        return Gear.lazy(() => Gear.sinkFlow(flow => flow
            .defaultsTo(this.defaultSample)
            .branch(flow => flow.map(template => template.vertexShader).to(Gear.writeableValue("vertex-shader")), flow => flow.map(template => template.fragmentShader).to(Gear.writeableValue("fragment-shader")))));
    }
    get xBinding() {
        return Gear.lazy(() => Gear.sinkFlow(flow => flow
            .defaultsTo(0)
            .map(index => this.xScalar = index >= 0 ? this.programScalars[index] : null)
            .map(scalar => scalar != null ? round3(scalar.uniform.data[scalar.index]).toString() : "")
            .to(Gear.text("mouse-x-val"))));
    }
    get yBinding() {
        return Gear.lazy(() => Gear.sinkFlow(flow => flow
            .defaultsTo(0)
            .map(index => this.yScalar = index >= 0 ? this.programScalars[index] : null)
            .map(scalar => scalar != null ? round3(scalar.uniform.data[scalar.index]).toString() : "")
            .to(Gear.text("mouse-y-val"))));
    }
    get xy() {
        return Gear.lazy(() => Gear.sinkFlow(flow => flow.defaultsTo([0, 0]).producer(([x, y]) => {
            this.setValue("mouse-x-val", this.xScalar, x);
            this.setValue("mouse-y-val", this.yScalar, y);
            this.draw();
        })));
    }
    recompile(shaders) {
        if (this.program != null) {
            this.program.delete();
        }
        this.program = this.context.link(this.context.vertexShader(shaders.vertexShader), this.context.fragmentShader(shaders.fragmentShader));
        this.program.use();
        return this.program;
    }
    setValue(boundElement, scalar, value) {
        if (scalar != null) {
            const data = scalar.uniform.data;
            data[scalar.index] = value;
            scalar.uniform.data = data;
            Gear.text(boundElement).consumer(round3(value).toString());
        }
        else {
            Gear.text(boundElement).consumer("");
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
            glAttribute.pointTo(this.buffer, 4);
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
                data.push(2 * x / lod - 1.0, 2 * (y + 1) / lod - 1.0, 0, 1);
                data.push(2 * x / lod - 1.0, 2 * y / lod - 1.0, 0, 1);
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