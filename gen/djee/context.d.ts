import { Shader, ShaderType } from "./shader.js";
import { Program } from "./program.js";
import { Buffer } from "./buffer.js";
export declare class Context {
    readonly canvas: HTMLCanvasElement;
    readonly gl: WebGLRenderingContext;
    constructor(canvasId: string);
    private getCanvas;
    private getContext;
    private doGetContext;
    with<T>(glCode: (gl: WebGLRenderingContext) => T): T;
    shaderFromElement(scriptId: string): Shader;
    vertexShader(code: string): Shader;
    fragmentShader(code: string): Shader;
    shader(type: ShaderType, code: string): Shader;
    linkFromElements(scriptIds: string[]): Program;
    link(shaders: Shader[]): Program;
    newBuffer(): Buffer;
}
//# sourceMappingURL=context.d.ts.map