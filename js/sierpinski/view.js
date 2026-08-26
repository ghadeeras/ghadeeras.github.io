import * as gear from "gear";
import { wgl } from "lumen";
const vertexShader = /*glsl*/ `
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
const fragmentShader = /*glsl*/ `
    precision mediump float;
    
    void main() {
        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
`;
const ST = wgl.ShaderType;
export class View {
    constructor(canvasId, depthId, twistId, scaleId) {
        this.mustShowCorners = true;
        this.mustShowCenters = true;
        this.stride = 0;
        this.context = wgl.Context.of(canvasId);
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
        this.depthElement = gear.htmlElement(depthId);
        this.twistElement = gear.htmlElement(twistId);
        this.scaleElement = gear.htmlElement(scaleId);
        this.setTwist(0);
        this.setScale(1);
        this.setShowCorners(true);
        this.setShowCenters(true);
    }
    setSierpinski(flattenedSierpinski) {
        this.cornersBuffer.float32Data = flattenedSierpinski.corners;
        this.centersBuffer.float32Data = flattenedSierpinski.centers;
        this.stride = flattenedSierpinski.stride;
        this.depthElement.innerText = flattenedSierpinski.depth.toFixed(0);
    }
    setTwist(twist) {
        this.shaderTwist.data = [twist];
        this.twistElement.innerText = twist.toFixed(3);
    }
    setScale(scale) {
        this.shaderScale.data = [scale];
        this.scaleElement.innerText = scale.toFixed(3);
    }
    setShowCorners(showCorners) {
        this.mustShowCorners = showCorners;
    }
    setShowCenters(showCenters) {
        this.mustShowCenters = showCenters;
    }
    draw() {
        setTimeout(() => {
            const gl = this.context.gl;
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