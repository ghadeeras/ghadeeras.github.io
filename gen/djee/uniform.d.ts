import { Program } from "./program.js";
export declare class Uniform {
    readonly program: Program;
    readonly name: string;
    readonly size: number;
    readonly matrix: boolean;
    readonly location: WebGLUniformLocation;
    readonly setter: (v: Float64Array) => void;
    private _data;
    constructor(program: Program, name: string, size: number, matrix?: boolean);
    private getSetter;
    get data(): number[];
    set data(data: number[]);
}
//# sourceMappingURL=uniform.d.ts.map