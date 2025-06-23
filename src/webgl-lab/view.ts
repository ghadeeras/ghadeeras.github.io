import * as aether from "aether"
import * as oldGear from "../utils/legacy/gear/index.js"
import { wgl } from "lumen"
import { values } from "../djee/utils.js"
import { ProgramSample } from "./samples.js"

export type Named = {
    name: string;
}

type Reflection = {
    program: wgl.Program;
    attributes: wgl.VariableInfo[];
    uniforms: wgl.VariableInfo[];
};

type Scalar = {
    uniform: wgl.Uniform;
    index: number;
    name: string;
}

export type ViewInputs = {

    readonly program: oldGear.Value<ProgramSample>
    readonly mesh: oldGear.Value<boolean> 
    readonly levelOfDetails: oldGear.Value<number>
    readonly programSample: oldGear.Value<ProgramSample>
    readonly mouseXBinding: oldGear.Value<number>
    readonly mouseYBinding: oldGear.Value<number>
    readonly mouseXY: oldGear.Value<aether.Vec<2>>

}


export class View {

    private context: wgl.Context;
    private buffer: wgl.AttributesBuffer;
    private program: wgl.Program | null = null;
    private defaultSample: ProgramSample;
    
    private lod = 50;
    private mode: typeof WebGL2RenderingContext.LINE_STRIP | typeof WebGL2RenderingContext.TRIANGLE_STRIP = WebGL2RenderingContext.TRIANGLE_STRIP;
    private cullingEnabled = false;
    private programScalars: Scalar[] = [];
    private xScalar: Scalar | null = null;
    private yScalar: Scalar | null = null;
    
    constructor(canvasId: string, samples: ProgramSample[], inputs: ViewInputs) {
        setOptions("shader-sample", options(samples));
        this.context = wgl.Context.of(canvasId);
        this.buffer = this.context.newAttributesBuffer();
        this.defaultSample = samples[0];

        inputs.mesh
            .defaultsTo(false)
            .then(oldGear.choice(WebGL2RenderingContext.LINE_STRIP, WebGL2RenderingContext.TRIANGLE_STRIP))
            .attach(mode => {
                this.mode = mode;
                this.draw()
            })

        oldGear.text("lod").value = inputs.levelOfDetails
            .defaultsTo(this.lod)
            .filter(lod => lod > 0 && lod <= 100)
            .attach(lod => this.resetBuffer(lod))
            .map(lod => (lod + 1000).toString().substring(1))

        inputs.program
            .defaultsTo(this.defaultSample)
            .map(shaders => this.recompile(shaders))
            .map(program => this.reflectOn(program))
            .map(reflection => this.programScalars = this.toScalars(reflection))
            .attach(scalars => {
                this.draw()
                setOptions("mouse-x", [noneOption(), ...options(scalars)])
                setOptions("mouse-y", [noneOption(), ...options(scalars)])
            })
            
        const programSample = inputs.programSample.defaultsTo(this.defaultSample)
        oldGear.writeableValue("vertex-shader").value = programSample.map(template => template.vertexShader)
        oldGear.writeableValue("fragment-shader").value = programSample.map(template => template.fragmentShader)

        const mouseXY = inputs.mouseXY.defaultsTo([0, 0]);

        oldGear.text("mouse-x-val").value = oldGear.Value.from(
            inputs.mouseXBinding
                .defaultsTo(0)
                .map(index => this.xScalar = index >= 0 ? this.programScalars[index] : null)
                .map(scalar => scalar != null ? scalar.uniform.data[scalar.index].toPrecision(3) : ""),
            mouseXY
                .map(([x, _]) => this.xScalar != null ? x.toPrecision(3) : "")
        )

        oldGear.text("mouse-y-val").value = oldGear.Value.from(
            inputs.mouseYBinding
                .defaultsTo(0)
                .map(index => this.yScalar = index >= 0 ? this.programScalars[index] : null)
                .map(scalar => scalar != null ? scalar.uniform.data[scalar.index].toPrecision(3) : ""),
            mouseXY
                .map(([_, y]) => this.yScalar != null ? y.toPrecision(3) : "")
        )
        
        mouseXY.attach(([x, y]) => {
            this.setValue(this.xScalar, x);            
            this.setValue(this.yScalar, y);            
            this.draw();
        });
    }
        
    private recompile(shaders: ProgramSample): wgl.Program {
        if (this.program != null) {
            this.program.delete();
        }
        this.program = this.context.link(
            this.context.vertexShader(shaders.vertexShader),
            this.context.fragmentShader(shaders.fragmentShader),
        );
        this.program.use();
        return this.program;
    }

    private setValue(scalar: Scalar | null, value: number) {
        if (scalar != null) {
            const data = scalar.uniform.data;
            data[scalar.index] = value;
            scalar.uniform.data = data;    
        }
    }

    private reflectOn(program: wgl.Program): Reflection {
        return {
            program: program,
            attributes: values(program.attributeInfos).filter(attribute => attribute.itemCount == 1),
            uniforms: values(program.uniformInfos).filter(uniform => uniform.itemCount == 1)
        }
    }

    private toScalars(reflection: Reflection): Scalar[] {
        const result: Scalar[] = []
        for (const attribute of reflection.attributes) {
            const glAttribute = reflection.program.attribute(attribute.name)
            glAttribute.pointTo(this.buffer);
        }
        for (const uniform of reflection.uniforms) {
            const dimensions = uniform.itemDimensions;
            const glUniform = reflection.program.uniform(uniform.name)
            const data: number[] = [];
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

    private resetBuffer(lod: number) {
        const data: number[] = [];
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

    private draw() {
        if (this.program) {
            const gl = this.context.gl;
            gl.frontFace(gl.CCW);
            gl.cullFace(gl.BACK);

            gl.enable(gl.DEPTH_TEST);
            if (this.cullingEnabled) {
                gl.enable(gl.CULL_FACE);
            } else {
                gl.disable(gl.CULL_FACE)
            }

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            const rowVertexCount = 2 * (this.lod + 1);
            for (let y = 0; y < this.lod; y++) {
                gl.drawArrays(this.mode, y * rowVertexCount, rowVertexCount);
            }
        }
    }

}

function setOptions(elementId: string, options: HTMLOptionElement[]) {
    const element = document.getElementById(elementId) as HTMLSelectElement;
    element.innerHTML = "";
    options.forEach(option => element.add(option));
}

function options(values: Named[]): HTMLOptionElement[] {
    return values.map((value, i) => new Option(value.name, i.toString()));
}

function noneOption() {
    return new Option("NONE", "-1");
}
