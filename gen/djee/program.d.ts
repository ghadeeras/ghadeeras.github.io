import { Context } from "./context.js";
import { Shader } from "./shader.js";
import { Attribute } from "./attribute.js";
import { Uniform } from "./uniform.js";
export declare type Variable = {
    name: string;
    type: number;
    dimensions: number;
    size: number;
};
export declare class Program {
    readonly context: Context;
    readonly shaders: Shader[];
    readonly program: WebGLProgram;
    constructor(context: Context, shaders: Shader[]);
    private makeProgram;
    delete(): void;
    use(): void;
    locateAttribute(name: string, size: number): Attribute;
    locateUniform(name: string, size: number, matrix?: boolean): Uniform;
    get uniforms(): Variable[];
    get attributes(): Variable[];
    private activeInfos;
    private dimensions;
}
//# sourceMappingURL=program.d.ts.map