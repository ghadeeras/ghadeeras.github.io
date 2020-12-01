import { Shader, ShaderType } from "./shader.js";
import { Program } from "./program.js";
import { Buffer } from "./buffer.js";
export class Context {
    constructor(canvasId) {
        this.canvas = this.getCanvas(canvasId);
        this.gl = this.getContext(this.canvas);
    }
    getCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw `No canvas found with ID: ${canvasId}`;
        }
        return canvas;
    }
    getContext(canvas) {
        const gl = this.doGetContext(canvas);
        if (!gl) {
            throw "Your browser seems not to support WebGL!";
        }
        return gl;
    }
    doGetContext(canvas) {
        try {
            return canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    with(glCode) {
        return glCode(this.gl);
    }
    shaderFromElement(scriptId) {
        return Shader.fromElement(this, scriptId);
    }
    vertexShader(code) {
        return this.shader(ShaderType.VertexShader, code);
    }
    fragmentShader(code) {
        return this.shader(ShaderType.FragmentShader, code);
    }
    shader(type, code) {
        return new Shader(this, type, code);
    }
    linkFromElements(scriptIds) {
        const shaders = scriptIds.map(id => this.shaderFromElement(id));
        return this.link(shaders);
    }
    link(shaders) {
        return new Program(this, shaders);
    }
    newBuffer() {
        return new Buffer(this);
    }
}
//# sourceMappingURL=context.js.map