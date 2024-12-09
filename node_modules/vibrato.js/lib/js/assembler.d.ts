import * as exps from './expressions.js';
import * as rt from './rt-node.js';
export declare class Assembler {
    readonly rawMemTextCode: string;
    readonly rawMemBinaryCode: Uint8Array;
    readonly nonOptimizedTextCode: string;
    readonly nonOptimizedBinaryCode: Uint8Array;
    readonly textCode: string;
    readonly binaryCode: Uint8Array;
    constructor(expressions: exps.Expression[]);
    private newModule;
    private organizeMemory;
    private declareCycleFunction;
    private declareExpressionFunctions;
    private validate;
    get rawMem(): ArrayBufferLike;
    exports<E extends WebAssembly.Exports>(rt: rt.Runtime): E;
}
