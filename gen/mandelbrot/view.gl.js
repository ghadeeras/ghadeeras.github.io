var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { gear } from "/gen/libs.js";
import * as gearx from "../utils/gear.js";
import { wgl } from "../djee/index.js";
export class ViewGL {
    constructor(julia, _canvasId, _vertexShaderCode, _fragmentShaderCode, _center = [-0.75, 0], _scale = 2.0) {
        this.julia = julia;
        this.drawCall = new gear.DeferredComputation(() => this.doDraw());
        this.context = wgl.Context.of(_canvasId);
        const program = this.context.link(this.context.vertexShader(_vertexShaderCode), this.context.fragmentShader(_fragmentShaderCode));
        program.use();
        this.uniformColor = program.uniform("color");
        this.uniformIntensity = program.uniform("intensity");
        this.uniformPalette = program.uniform("palette");
        this.uniformCenter = program.uniform("center");
        this.uniformScale = program.uniform("scale");
        this.hue = 5 / 4;
        this.saturation = Math.sqrt(2) / 2;
        this.intensity = 0.5;
        this.palette = 0;
        this.center = _center;
        this.scale = _scale;
    }
    get canvas() {
        return this.context.canvas;
    }
    get center() {
        return [this.uniformCenter.data[0], this.uniformCenter.data[1]];
    }
    set center(c) {
        this.uniformCenter.data = c;
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
    draw() {
        this.drawCall.perform();
    }
    doDraw() {
        const gl = this.context.gl;
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
    }
}
export function viewGL(julia, canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        const shader = yield gearx.fetchTextFile("/shaders/mandelbrot.frag");
        const vertexShader = wgl.vertexShaders.fullScreenPass;
        const fragmentShader = wgl.fragmentShaders.fullScreenPass(shader);
        return new ViewGL(julia, canvasId, vertexShader, fragmentShader, center, scale);
    });
}
//# sourceMappingURL=view.gl.js.map