import * as Gear from "../gear/all.js";
import * as Djee from "../djee/all.js";
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
`;
var ST = Djee.ShaderType;
function round(value) {
    return Math.round(1000 * value) / 1000;
}
export class View {
    constructor(canvasId, depthId, twistId, scaleId) {
        this.mustShowCorners = true;
        this.mustShowCenters = true;
        this.stride = 0;
        this.context = Djee.Context.of(canvasId);
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
        this.sierpinsky = Gear.sink(s => this.setSierpinski(s));
        this.depth = Gear.sinkFlow(flow => flow.defaultsTo(5).map(v => v + "").to(Gear.text(depthId)));
        this.twist = Gear.sinkFlow(flow => flow.defaultsTo(0).branch(flow => flow.to(Gear.sink(t => this.setTwist(t)))).map(v => v + "").to(Gear.text(twistId)));
        this.scale = Gear.sinkFlow(flow => flow.defaultsTo(1).branch(flow => flow.to(Gear.sink(s => this.setScale(s)))).map(v => v + "").to(Gear.text(scaleId)));
        this.showCorners = Gear.sink(show => this.setShowCorners(show));
        this.showCenters = Gear.sink(show => this.setShowCenters(show));
    }
    setSierpinski(flattenedSierpinski) {
        this.cornersBuffer.float32Data = flattenedSierpinski.corners;
        this.centersBuffer.float32Data = flattenedSierpinski.centers;
        this.stride = flattenedSierpinski.stride;
        this.draw();
    }
    setTwist(twist) {
        this.shaderTwist.data = [twist];
        this.draw();
    }
    setScale(scale) {
        this.shaderScale.data = [scale];
        this.draw();
    }
    setShowCorners(showCorners) {
        this.mustShowCorners = showCorners;
        this.draw();
    }
    setShowCenters(showCenters) {
        this.mustShowCenters = showCenters;
        this.draw();
    }
    draw() {
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
//# sourceMappingURL=view.js.map