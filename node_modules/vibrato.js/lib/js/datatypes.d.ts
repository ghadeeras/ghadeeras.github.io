import binaryen from "binaryen";
export type Case<T, A, B> = T extends A ? B : never;
export type NumberArray = Int32Array | Float64Array;
export type PrimitiveSize<A extends NumberArray> = Case<A, Int32Array, 4> | Case<A, Float64Array, 8>;
export type PrimitiveName<A extends NumberArray> = Case<A, Int32Array, "integer"> | Case<A, Float64Array, "real">;
export type BinaryenInstructionType = binaryen.Module["i32"] | binaryen.Module["f64"];
export interface RawView {
    get(byteOffset: number): number;
    set(byteOffset: number, value: number): RawView;
}
export interface Primitive<A extends NumberArray> {
    readonly name: PrimitiveName<A>;
    readonly sizeInBytes: PrimitiveSize<A>;
    readonly binaryenType: binaryen.Type;
    instructionType(module: binaryen.Module): BinaryenInstructionType;
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A;
    rawView(buffer: ArrayBuffer, byteOffset?: number): RawView;
}
export interface DataType<A extends NumberArray> {
    readonly componentType: Primitive<A>;
    readonly size: number;
    readonly sizeInBytes: number;
    readonly binaryenType: binaryen.Type;
    instructionType(module: binaryen.Module): BinaryenInstructionType;
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A[];
    flatView(buffer: ArrayBuffer, byteOffset?: number, length?: number): A;
    buffer(array: number[]): ArrayBuffer;
    assignableFrom<T extends DataType<A>>(dataType: T): boolean;
    asVector(): Vector<A>;
    asArray(): DataArray<A, any>;
}
export interface Vector<A extends NumberArray> extends DataType<A> {
}
export interface DataArray<A extends NumberArray, T extends DataType<A>> extends DataType<A> {
    readonly itemType: T;
    readonly length: number;
}
export declare class Integer implements Primitive<Int32Array> {
    readonly name = "integer";
    readonly sizeInBytes = 4;
    readonly binaryenType: number;
    private constructor();
    instructionType(module: binaryen.Module): {
        load(offset: number, align: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        load8_s(offset: number, align: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        load8_u(offset: number, align: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        load16_s(offset: number, align: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        load16_u(offset: number, align: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        store(offset: number, align: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        store8(offset: number, align: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        store16(offset: number, align: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        const(value: number): binaryen.ExpressionRef;
        clz(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        ctz(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        popcnt(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        eqz(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        trunc_s: {
            f32(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
            f64(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        };
        trunc_u: {
            f32(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
            f64(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        };
        trunc_s_sat: {
            f32(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
            f64(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        };
        trunc_u_sat: {
            f32(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
            f64(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        };
        reinterpret(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        extend8_s(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        extend16_s(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        wrap(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        add(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        sub(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        mul(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        div_s(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        div_u(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        rem_s(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        rem_u(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        and(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        or(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        xor(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        shl(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        shr_u(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        shr_s(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        rotl(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        rotr(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        eq(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        ne(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        lt_s(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        lt_u(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        le_s(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        le_u(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        gt_s(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        gt_u(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        ge_s(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        ge_u(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        atomic: {
            load(offset: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            load8_u(offset: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            load16_u(offset: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            store(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            store8(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            store16(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            rmw: {
                add(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                sub(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                and(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                or(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                xor(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                xchg(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                cmpxchg(offset: number, ptr: binaryen.ExpressionRef, expected: binaryen.ExpressionRef, replacement: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            };
            rmw8_u: {
                add(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                sub(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                and(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                or(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                xor(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                xchg(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                cmpxchg(offset: number, ptr: binaryen.ExpressionRef, expected: binaryen.ExpressionRef, replacement: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            };
            rmw16_u: {
                add(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                sub(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                and(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                or(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                xor(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                xchg(offset: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
                cmpxchg(offset: number, ptr: binaryen.ExpressionRef, expected: binaryen.ExpressionRef, replacement: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
            };
        };
        pop(): binaryen.ExpressionRef;
    };
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): Int32Array;
    rawView(buffer: ArrayBuffer, byteOffset?: number): RawView;
    static readonly type: Integer;
}
export declare class Real implements Primitive<Float64Array> {
    readonly name = "real";
    readonly sizeInBytes = 8;
    readonly binaryenType: number;
    private constructor();
    instructionType(module: binaryen.Module): {
        load(offset: number, align: number, ptr: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        store(offset: number, align: number, ptr: binaryen.ExpressionRef, value: binaryen.ExpressionRef, name?: string): binaryen.ExpressionRef;
        const(value: number): binaryen.ExpressionRef;
        const_bits(low: number, high: number): binaryen.ExpressionRef;
        neg(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        abs(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        ceil(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        floor(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        trunc(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        nearest(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        sqrt(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        reinterpret(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        convert_s: {
            i32(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
            i64(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        };
        convert_u: {
            i32(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
            i64(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        };
        promote(value: binaryen.ExpressionRef): binaryen.ExpressionRef;
        add(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        sub(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        mul(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        div(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        copysign(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        min(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        max(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        eq(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        ne(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        lt(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        le(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        gt(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        ge(left: binaryen.ExpressionRef, right: binaryen.ExpressionRef): binaryen.ExpressionRef;
        pop(): binaryen.ExpressionRef;
    };
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): Float64Array;
    rawView(buffer: ArrayBuffer, byteOffset?: number): RawView;
    static readonly type: Real;
}
export declare const integer: Integer;
export declare const real: Real;
declare abstract class GenericDataType<A extends NumberArray> implements DataType<A> {
    readonly componentType: Primitive<A>;
    readonly size: number;
    readonly sizeInBytes: number;
    readonly binaryenType: binaryen.Type;
    constructor(componentType: Primitive<A>, size: number);
    abstract asVector(): Vector<A>;
    abstract asArray(): DataArray<A, any>;
    instructionType(module: binaryen.Module): BinaryenInstructionType;
    view(buffer: ArrayBuffer, byteOffset?: number, length?: number): A[];
    flatView(buffer: ArrayBuffer, byteOffset?: number, length?: number): A;
    buffer(array: number[]): ArrayBuffer;
    assignableFrom<T extends DataType<A>>(dataType: T): boolean;
}
declare class GenericVector<A extends NumberArray> extends GenericDataType<A> {
    constructor(componentType: Primitive<A>, size: number);
    asVector(): Vector<A>;
    asArray(): DataArray<A, any>;
}
declare class GenericArray<A extends NumberArray, T extends DataType<A>> extends GenericDataType<A> implements DataArray<A, T> {
    readonly itemType: T;
    readonly length: number;
    constructor(itemType: T, length: number);
    asVector(): Vector<A>;
    asArray(): DataArray<A, any>;
}
export declare function vectorOf<A extends NumberArray>(size: number, primitiveType: Primitive<A>): Vector<A>;
export declare function arrayOf<A extends NumberArray, T extends DataType<A>>(length: number, itemType: T): GenericArray<NumberArray, T>;
export declare class Discrete extends GenericVector<Int32Array> {
    asVector(): Vector<Int32Array>;
    asArray(): DataArray<Int32Array, any>;
    private constructor();
    static readonly type: Discrete;
}
export declare class Scalar extends GenericVector<Float64Array> {
    asVector(): Vector<Float64Array>;
    asArray(): DataArray<Float64Array, any>;
    private constructor();
    static readonly type: Scalar;
}
export declare class Complex extends GenericVector<Float64Array> {
    asVector(): Vector<Float64Array>;
    asArray(): DataArray<Float64Array, any>;
    private constructor();
    static readonly type: Complex;
}
export declare const discrete: Discrete;
export declare const scalar: Scalar;
export declare const complex: Complex;
export {};
