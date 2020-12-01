import { Context } from "./context.js";
export declare class Buffer {
    readonly context: Context;
    readonly buffer: WebGLBuffer;
    private _data;
    constructor(context: Context);
    bind<T>(glCode: (gl: WebGLRenderingContext) => T): T;
    get data(): Float32Array;
    set data(data: Float32Array);
    set untypedData(data: number[]);
}
//# sourceMappingURL=buffer.d.ts.map