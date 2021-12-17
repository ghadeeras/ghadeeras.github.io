import * as gear from "../../gear/latest/index.js"
import * as djee from "../djee/all.js"
import { FlattenedSierpinski } from "./model.js"

var vertexShader = `
    attribute vec2 vPosition;
    
    uniform float twist;
    uniform float scale;
    
    void main() {
    vec2 p = scale * vPosition;
    float angle = twist * length(p);
    float s = sin(angle);
    float c = cos(angle);
    mat2 rotation = mat2(vec2(c, s), vec2(-s, c));
    gl_Position = vec4(rotation * p, 0.0, 1.0);
    }
`;

var fragmentShader = `
    precision mediump float;
    
    void main() {
    gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
`

var ST = djee.ShaderType;

function round(value: number) {
    return Math.round(1000 * value) / 1000;
}

export type ViewInputs = {
    readonly sierpinsky: gear.Value<FlattenedSierpinski>;
    readonly showCorners: gear.Value<boolean>;
    readonly showCenters: gear.Value<boolean>;
    readonly depth: gear.Value<number>;
    readonly twist: gear.Value<number>;
    readonly scale: gear.Value<number>;        
}

export class View {
    
    private readonly context: djee.Context;
    private readonly vertexShader: djee.Shader;
    private readonly fragmentShader: djee.Shader;
    private readonly program: djee.Program;

    private readonly shaderPosition: djee.Attribute;
    private readonly shaderTwist: djee.Uniform;
    private readonly shaderScale: djee.Uniform;
    private readonly cornersBuffer: djee.AttributesBuffer;
    private readonly centersBuffer: djee.AttributesBuffer;

    private mustShowCorners: boolean = true;
    private mustShowCenters: boolean = true;
    private stride: number = 0;

    constructor(
        canvasId: string, 
        depthId: string, 
        twistId: string, 
        scaleId: string,
        inputs: ViewInputs
    ) {
        this.context = djee.Context.of(canvasId);

        this.vertexShader = this.context.shader(ST.VertexShader, vertexShader);
        this.fragmentShader = this.context.shader(ST.FragmentShader, fragmentShader);
        this.program = this.context.link(this.vertexShader, this.fragmentShader);
        this.program.use();

        this.shaderPosition = this.program.attribute("vPosition");
        this.shaderTwist = this.program.uniform("twist");
        this.shaderScale = this.program.uniform("scale");

        this.cornersBuffer = this.context.newAttributesBuffer();
        this.centersBuffer = this.context.newAttributesBuffer();

        this.context.gl.clearColor(1, 1, 1, 1);

        const twist = inputs.twist.defaultsTo(0);
        const scale = inputs.scale.defaultsTo(1);

        gear.text(depthId).value = inputs.depth.defaultsTo(5).map(v => v + "")
        gear.text(twistId).value = twist.map(v => round(v) + "")
        gear.text(scaleId).value = twist.map(v => round(v) + "")

        twist.attach(t => this.setTwist(t))
        scale.attach(s => this.setScale(s))
        inputs.sierpinsky.attach(s => this.setSierpinski(s));
        inputs.showCorners.defaultsTo(true).attach(show => this.setShowCorners(show));
        inputs.showCenters.defaultsTo(true).attach(show => this.setShowCenters(show));
    }

    private setSierpinski(flattenedSierpinski: FlattenedSierpinski) {
        this.cornersBuffer.float32Data = flattenedSierpinski.corners;
        this.centersBuffer.float32Data = flattenedSierpinski.centers;
        this.stride = flattenedSierpinski.stride;
        this.draw();
    }
    
    private setTwist(twist: number) {
        this.shaderTwist.data = [twist];
        this.draw();
    }

    private setScale(scale: number) {
        this.shaderScale.data = [scale];
        this.draw();
    }

    private setShowCorners(showCorners: boolean) {
        this.mustShowCorners = showCorners
        this.draw()
    }

    private setShowCenters(showCenters: boolean) {
        this.mustShowCenters = showCenters
        this.draw()
    }

    private draw() {
        setTimeout(() => {
            var gl = this.context.gl;
            gl.clear(gl.COLOR_BUFFER_BIT);

            if (this.mustShowCorners) {
                this.shaderPosition.pointTo(this.cornersBuffer);
                gl.drawArrays(gl.TRIANGLES, 0, this.cornersBuffer.data.length / this.stride);
            }

            if (this.mustShowCenters) {
                this.shaderPosition.pointTo(this.centersBuffer);
                gl.drawArrays(gl.TRIANGLES, 0, this.centersBuffer.data.length / this.stride);
            }
        });
    }

}
