import { Program } from "./program.js";
import { Buffer } from "./buffer.js";
export declare class Attribute {
    readonly program: Program;
    readonly name: string;
    readonly size: number;
    readonly location: number;
    constructor(program: Program, name: string, size: number);
    pointTo(buffer: Buffer, stride?: number, offset?: number): void;
}
//# sourceMappingURL=attribute.d.ts.map