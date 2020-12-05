import { Shader, ShaderType } from "./shader.js"
import { Program } from "./program.js"
import { Buffer } from "./buffer.js"

export class Context {

    readonly canvas: HTMLCanvasElement;
    readonly gl: WebGLRenderingContext;

    constructor(canvasId: string) {
        this.canvas = this.getCanvas(canvasId);
        this.gl = this.getContext(this.canvas);
    }

    private getCanvas(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw `No canvas found with ID: ${canvasId}`;
        }
        return canvas;
    }

    private getContext(canvas: HTMLCanvasElement) {
        return this.doGetContext(canvas) ?? this.failure(canvas)
    }

    private failure(canvas: HTMLCanvasElement): WebGLRenderingContext {
        throw new Error("Failed to get GL context from element: " + canvas.id)
    }

    private doGetContext(canvas: HTMLCanvasElement) {
        try {
            return canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    with<T>(glCode: (gl: WebGLRenderingContext) => T) {
        return glCode(this.gl);
    }

    shaderFromElement(scriptId: string) {
        return Shader.fromElement(this, scriptId);
    }

    vertexShader(code: string) {
        return this.shader(ShaderType.VertexShader, code);
    }

    fragmentShader(code: string) {
        return this.shader(ShaderType.FragmentShader, code);
    }

    shader(type: ShaderType, code: string) {
        return new Shader(this, type, code);
    }

    linkFromElements(scriptIds: string[]) {
        const shaders = scriptIds.map(id => this.shaderFromElement(id));
        return this.link(shaders);
    }
    
    link(shaders: Shader[]) {
        return new Program(this, shaders);
    }

    newBuffer() {
        return new Buffer(this);
    }

}
