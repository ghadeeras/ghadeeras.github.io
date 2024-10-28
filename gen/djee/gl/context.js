import { Shader, ShaderType } from "./shader.js";
import { Program } from "./program.js";
import { AttributesBuffer, IndicesBuffer } from "./buffer.js";
import { failure } from "../utils.js";
import { Texture2D } from "./texture.js";
import { RenderBuffer } from "./renderbuffer.js";
import { FrameBuffer } from "./framebuffer.js";
export class Context {
    constructor(canvasElementId, options) {
        this.canvas = getCanvas(canvasElementId);
        this.gl = getContext(this.canvas, options);
    }
    static of(canvasElementId, options) {
        return new Context(canvasElementId, options);
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
    newAttributesBuffer(byteStride = 0, isDynamic = false) {
        return new AttributesBuffer(this, byteStride, isDynamic);
    }
    newIndicesBuffer(isDynamic = false) {
        return new IndicesBuffer(this, isDynamic);
    }
    newTexture2D(unit = 0) {
        return new Texture2D(this, unit);
    }
    newRenderBuffer(format, width, height) {
        return new RenderBuffer(this, format, width, height);
    }
    newFrameBuffer() {
        return new FrameBuffer(this);
    }
}
function getCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    return canvas ? canvas : failure(`No canvas found with ID: ${canvasId}`);
}
function getContext(canvas, options) {
    const context = canvas.getContext("webgl2", options);
    return context !== null && context !== void 0 ? context : failure(`Failed to get GL context from element: ${canvas.id}`);
}
//# sourceMappingURL=context.js.map