import * as types from './datatypes.js';
import * as rt from './rt.js';
import binaryen from 'binaryen';
export declare function newBlockName(): string;
export declare function newValueName(): string;
export declare function newDelayName(): string;
export type ValueExports = Record<string, (...params: number[]) => number>;
export interface Expression {
    subExpressions(): Expression[];
    memory(memoryAllocator: StaticMemoryAllocator): void;
    functions(module: binaryen.Module): binaryen.FunctionRef[];
    read(module: binaryen.Module): binaryen.ExpressionRef[];
    write(module: binaryen.Module): binaryen.ExpressionRef[];
    exports(): Record<string, string>;
}
export declare abstract class Value<A extends types.NumberArray> implements Expression {
    readonly type: types.DataType<A>;
    private calculated;
    private cachedValue;
    private _parameterTypes;
    constructor(type: types.DataType<A>, parameterTypes: types.DataType<any>[]);
    get parameterTypes(): types.DataType<any>[];
    abstract subExpressions(): Expression[];
    named(name?: string | null, isTestValue?: boolean): NamedValue<A>;
    delay(length: number): Delay<A>;
    get(): number[] | null;
    abstract calculate(): number[] | null;
    exports(): Record<string, string>;
    expression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef;
    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef;
    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef;
    abstract primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef;
    memory(memoryAllocator: StaticMemoryAllocator): void;
    functions(module: binaryen.Module): binaryen.FunctionRef[];
    read(module: binaryen.Module): binaryen.ExpressionRef[];
    write(module: binaryen.Module): binaryen.ExpressionRef[];
    protected checkParameters(parameters: FunctionLocal[]): void;
    protected typeInfo(module: binaryen.Module): [binaryen.Type, types.BinaryenInstructionType];
    protected allocateResultSpace(module: binaryen.Module): binaryen.ExpressionRef;
    protected block(module: binaryen.Module, expressions: binaryen.ExpressionRef[]): number;
    protected components<T>(mapper: (component: number) => T): Generator<T, void, unknown>;
}
export declare class NamedValue<A extends types.NumberArray> extends Value<A> {
    private wrapped;
    private isTestValue;
    readonly name: string;
    readonly isPublic: boolean;
    readonly signature: binaryen.Type[];
    constructor(wrapped: Value<A>, name: string | null, isTestValue?: boolean);
    subExpressions(): Expression[];
    calculate(): number[] | null;
    exports(): Record<string, string>;
    private publicExports;
    private testExports;
    evaluate(exports: ValueExports, parameters?: number[]): number;
    evaluateVector(exports: ValueExports, parameters?: number[]): number;
    evaluateComponent(exports: ValueExports, component: number, parameters?: number[]): number;
    assignVector(exports: ValueExports, ref: number, parameters?: number[]): number;
    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef;
    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef;
    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): number;
    functions(module: binaryen.Module): number[];
    private vectorName;
    private vectorAssignmentName;
    private primitiveName;
}
export interface Function<I extends Expression, O extends Expression> extends Expression {
    apply(input: I): O;
}
export declare class Delay<A extends types.NumberArray> extends Value<A> {
    readonly length: number;
    readonly type: types.DataType<A>;
    private readonly name;
    private readonly value;
    private readonly isPublic;
    private nextValueRef;
    private delayRef;
    private delayBufferRef;
    private constructor();
    static create<A extends types.NumberArray>(length: number, type: types.DataType<A>, value: (d: Delay<A>) => Value<A>): Delay<A>;
    static createNamed<A extends types.NumberArray>(name: string, length: number, type: types.DataType<A>, value: (d: Delay<A>) => Value<A>): Delay<A>;
    private readerName;
    private writerName;
    get delayReference(): rt.Reference;
    get delayBufferReference(): rt.Reference;
    memory(memoryAllocator: StaticMemoryAllocator): void;
    functions(module: binaryen.Module): binaryen.FunctionRef[];
    read(module: binaryen.Module): binaryen.ExpressionRef[];
    write(module: binaryen.Module): binaryen.ExpressionRef[];
    exports(): Record<string, string>;
    subExpressions(): Expression[];
    at(index: Value<Int32Array>): Value<A>;
    clear(memory: WebAssembly.Memory): void;
    calculate(): number[] | null;
    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef;
    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef;
    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): number;
}
export declare class Apply<A extends types.NumberArray> extends Value<A> {
    private value;
    private parameters;
    constructor(value: Value<A>, parameters: (Value<any> | null)[]);
    private static newParameterTypes;
    private static newParameters;
    subExpressions(): Expression[];
    calculate(): number[] | null;
    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): number;
    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): number;
    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): number;
    private doApply;
}
export declare class Variable<A extends types.NumberArray> extends Value<A> {
    constructor(type: types.DataType<A>, spread?: boolean);
    private static parameterTypes;
    private get isRef();
    subExpressions(): Expression[];
    calculate(): null;
    vectorExpression(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef;
    vectorAssignment(module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[], resultRef: binaryen.ExpressionRef): binaryen.ExpressionRef;
    primitiveExpression(component: number, module: binaryen.Module, variables: FunctionLocals, parameters: FunctionLocal[]): binaryen.ExpressionRef;
    static discrete(): Variable<Int32Array<ArrayBufferLike>>;
    static scalar(): Variable<Float64Array<ArrayBufferLike>>;
    static complex(): Variable<Float64Array<ArrayBufferLike>>;
    static spreadComplex(): Variable<Float64Array<ArrayBufferLike>>;
    static vectorOf<A extends types.NumberArray>(size: number, type: types.Primitive<A>): Variable<A>;
    static spreadVectorOf<A extends types.NumberArray>(size: number, type: types.Primitive<A>): Variable<A>;
}
export interface StaticMemoryAllocator {
    declare<A extends types.NumberArray>(dataType: types.DataType<A>, initialValue: number[]): number;
}
export declare class FunctionLocals {
    readonly module: binaryen.Module;
    private readonly _locals;
    constructor(module: binaryen.Module);
    declare(type: binaryen.Type): FunctionLocal;
    get locals(): FunctionLocal[];
    get localTypes(): binaryen.Type[];
}
export declare class FunctionLocal {
    readonly module: binaryen.Module;
    readonly type: binaryen.Type;
    readonly index: number;
    constructor(module: binaryen.Module, type: binaryen.Type, index: number);
    get(): binaryen.ExpressionRef;
    set(value: number): binaryen.ExpressionRef;
    tee(value: number): binaryen.ExpressionRef;
}
export declare function addFunction(module: binaryen.Module, name: string, signature: binaryen.Type[], returnType: binaryen.Type, bodyBuilder: (params: FunctionLocal[], variables: FunctionLocals) => binaryen.ExpressionRef): number;
