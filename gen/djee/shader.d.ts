import { Context } from "./context.js";
export declare class Shader {
    readonly context: Context;
    readonly type: ShaderType;
    readonly code: string;
    readonly shader: WebGLShader;
    constructor(context: Context, type: ShaderType, code: string);
    static fromElement(context: Context, scriptId: string): Shader;
    private static getScript;
    private static getShaderType;
    private makeShader;
    delete(): void;
}
export declare enum ShaderType {
    VertexShader,
    FragmentShader
}
//# sourceMappingURL=shader.d.ts.map