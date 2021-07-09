import { Shader, ShaderType } from "./shader.js";
import { Program } from "./program.js";
import { Buffer } from "./buffer.js";
import { failure } from "./utils.js";
import { Texture } from "./texture.js";
export class Context {
    constructor(canvasElementId) {
        this.canvas = getCanvas(canvasElementId);
        this.gl = getContext(this.canvas);
    }
    static of(canvasElementId) {
        return new Context(canvasElementId);
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
    linkFromElements(...scriptIds) {
        const shaders = scriptIds.map(id => this.shaderFromElement(id));
        return this.link(...shaders);
    }
    link(...shaders) {
        return new Program(this, shaders);
    }
    newBuffer(byteStride = 0, isDynamic = false) {
        return new Buffer(this, byteStride, isDynamic);
    }
    newTexture(unit = 0) {
        return new Texture(this, unit);
    }
}
function getCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    return canvas ? canvas : failure(`No canvas found with ID: ${canvasId}`);
}
function getContext(canvas) {
    const context = canvas.getContext("webgl");
    return context !== null && context !== void 0 ? context : failure(`Failed to get GL context from element: ${canvas.id}`);
}
//# sourceMappingURL=context.js.map