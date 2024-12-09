import * as types from '../datatypes.js';
import * as exps from '../expressions.js';
import binaryen from 'binaryen';
export declare class Literal<A extends types.NumberArray> extends exps.Value<A> {
    private value;
    private pointer;
    private constructor();
    subExpressions(): exps.Expression[];
    calculate(): number[];
    memory(memoryAllocator: exps.StaticMemoryAllocator): void;
    vectorExpression(module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef;
    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef;
    static discrete(value: number): Literal<Int32Array<ArrayBufferLike>>;
    static scalar(value: number): Literal<Float64Array<ArrayBufferLike>>;
    static complex(real: number, imaginary: number): Literal<Float64Array<ArrayBufferLike>>;
    static vector(...components: number[]): Literal<Float64Array<ArrayBufferLike>>;
}
