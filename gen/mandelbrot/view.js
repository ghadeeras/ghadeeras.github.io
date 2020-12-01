import * as Space from "../space/all.js";
import * as Djee from "../djee/all.js";
import * as Gear from "../gear/all.js";
export class View {
    constructor(julia, _canvasId, _vertexShaderCode, _fragmentShaderCode, _center = Space.vec(-0.75, 0), _scale = 2.0) {
        this.julia = julia;
        this.drawCall = new Gear.Call(() => this.doDraw());
        this.context = new Djee.Context(_canvasId);
        const program = this.context.link([
            this.context.vertexShader(_vertexShaderCode),
            this.context.fragmentShader(_fragmentShaderCode)
        ]);
        program.use();
        const buffer = this.context.newBuffer();
        buffer.untypedData = [
            -1, -1,
            +1, -1,
            -1, +1,
            +1, +1,
        ];
        const vertex = program.locateAttribute("vertex", 2);
        vertex.pointTo(buffer);
        this.uniformColor = program.locateUniform("color", 2);
        this.uniformIntensity = program.locateUniform("intensity", 1);
        this.uniformPalette = program.locateUniform("palette", 1);
        this.uniformCenter = program.locateUniform("center", 2);
        this.uniformScale = program.locateUniform("scale", 1);
        this.uniformJuliaNumber = program.locateUniform("juliaNumber", 3);
        this.hue = 5 / 4;
        this.saturation = Math.sqrt(2) / 2;
        this.intensity = 0.5;
        this.palette = 0;
        this.center = _center;
        this.scale = _scale;
        this.juliaNumber = Space.vec(0, 0, 0);
    }
    get center() {
        return Space.vec(...this.uniformCenter.data);
    }
    set center(c) {
        this.uniformCenter.data = c.coordinates;
        this.draw();
    }
    get scale() {
        return this.uniformScale.data[0];
    }
    set scale(s) {
        this.uniformScale.data = [s];
        this.draw();
    }
    get hue() {
        return this.uniformColor.data[0];
    }
    set hue(h) {
        this.setColor(h, this.saturation);
    }
    get saturation() {
        return this.uniformColor.data[1];
    }
    set saturation(s) {
        this.setColor(this.hue, s);
    }
    setColor(h, s) {
        this.uniformColor.data = [h, s];
        this.draw();
    }
    get intensity() {
        return this.uniformIntensity.data[0];
    }
    set intensity(i) {
        this.uniformIntensity.data = [i];
        this.draw();
    }
    get palette() {
        return this.uniformPalette.data[0];
    }
    set palette(p) {
        this.uniformPalette.data = [p];
        this.draw();
    }
    get juliaNumber() {
        return Space.vec(...this.uniformJuliaNumber.data);
    }
    set juliaNumber(j) {
        this.uniformJuliaNumber.data = [...j.swizzle(0, 1).coordinates, this.julia ? 1 : 0];
        this.draw();
    }
    draw() {
        this.drawCall.later();
    }
    doDraw() {
        const gl = this.context.gl;
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
//# sourceMappingURL=view.js.map