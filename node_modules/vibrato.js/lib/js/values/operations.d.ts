import * as types from '../datatypes.js';
import * as exps from '../expressions.js';
import binaryen from 'binaryen';
declare abstract class Reduction<A extends types.NumberArray, B extends types.NumberArray> extends exps.Value<A> {
    protected name: string;
    protected accumulator: exps.Value<A>;
    protected operands: exps.Value<B>[];
    protected constructor(name: string, accumulator: exps.Value<A>, operands: exps.Value<B>[]);
    private static parameterTypes;
    subExpressions(): exps.Expression[];
    calculate(): number[] | null;
    vectorAssignment(module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef;
    private applicationFunction;
    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef;
    protected abstract preApply(acc: number[], value: number[]): number[];
    protected abstract applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number;
}
declare abstract class Operation<A extends types.NumberArray> extends Reduction<A, A> {
    protected constructor(name: string, accumulator: exps.Value<A>, operands: exps.Value<A>[]);
}
export declare class Add<A extends types.NumberArray> extends Operation<A> {
    private constructor();
    protected preApply(acc: number[], value: number[]): number[];
    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number;
    static of<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]): Add<A>;
}
export declare class Sub<A extends types.NumberArray> extends Operation<A> {
    private constructor();
    protected preApply(acc: number[], value: number[]): number[];
    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number;
    static of<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]): Sub<A>;
}
export declare class Mul<A extends types.NumberArray> extends Operation<A> {
    private constructor();
    protected preApply(acc: number[], value: number[]): number[];
    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number;
    static of<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]): Mul<A>;
}
export declare class Div extends Operation<Float64Array> {
    private constructor();
    protected preApply(acc: number[], value: number[]): number[];
    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number;
    static of(firstOp: exps.Value<Float64Array>, ...restOps: exps.Value<Float64Array>[]): Div;
}
export declare class ScalarMul<A extends types.NumberArray> extends Reduction<A, A> {
    private constructor();
    protected preApply(acc: number[], value: number[]): number[];
    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number;
    static of<A extends types.NumberArray>(firstOp: exps.Value<A>, ...restOps: exps.Value<A>[]): ScalarMul<A>;
}
export declare class ScalarDiv extends Reduction<Float64Array, Float64Array> {
    private constructor();
    protected preApply(acc: number[], value: number[]): number[];
    protected applicationInstruction(module: binaryen.Module, instructionType: types.BinaryenInstructionType): (left: number, right: number) => number;
    static of(firstOp: exps.Value<Float64Array>, ...restOps: exps.Value<Float64Array>[]): ScalarDiv;
}
export declare class Dot extends exps.Value<Float64Array> {
    protected left: exps.Value<Float64Array>;
    protected right: exps.Value<Float64Array>;
    protected constructor(left: exps.Value<Float64Array>, right: exps.Value<Float64Array>);
    subExpressions(): exps.Expression[];
    calculate(): number[] | null;
    primitiveExpression(component: number, module: binaryen.Module, variables: exps.FunctionLocals, parameters: exps.FunctionLocal[]): binaryen.ExpressionRef;
    private applicationFunction;
    static of(left: exps.Value<Float64Array>, right: exps.Value<Float64Array>): Dot;
}
export {};
