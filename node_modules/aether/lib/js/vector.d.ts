import { Mat, Mat2, Mat3, Mat4 } from "./matrix.js";
export type Dim = 2 | 3 | 4;
export type DimMap<D extends Dim, D2, D3, D4> = D extends 4 ? D4 : never | D extends 3 ? D3 : never | D extends 2 ? D2 : never;
export type LowerDim<D extends Dim> = DimMap<D, never, 2, 3>;
export type HigherDim<D extends Dim> = DimMap<D, 3, 4, never>;
export type Component<D extends Dim> = DimMap<D, (0 | 1), (0 | 1 | 2), (0 | 1 | 2 | 3)>;
export type Tuple<T, D extends Dim> = DimMap<D, [T, T], [T, T, T], [T, T, T, T]>;
export type Vec<D extends Dim> = Tuple<number, D>;
export type VecDim<V extends Vec<any>> = V["length"];
export type SwizzleComponents<S extends Dim, D extends Dim> = Tuple<Component<S>, D>;
export type Vec2 = Vec<2>;
export type Vec3 = Vec<3>;
export type Vec4 = Vec<4>;
export type NumberArray = number[] | Float64Array | Float32Array | Int32Array | Int16Array | Int8Array | Uint32Array | Uint16Array | Uint8Array;
export interface VecMath<D extends Dim> {
    of(...components: Vec<D>): Vec<D>;
    gen(...components: [() => number] | Tuple<() => number, D>): () => Vec<D>;
    from(array: NumberArray, offset?: number): Vec<D>;
    add(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    sub(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    mul(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    div(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    scale(v: Vec<D>, f: number): Vec<D>;
    max(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    min(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    addAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    subAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    maxAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    minAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    neg(v: Vec<D>): Vec<D>;
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, D>): Vec<D>;
    dot(v1: Vec<D>, v2: Vec<D>): number;
    lengthSquared(v: Vec<D>): number;
    length(v: Vec<D>): number;
    setLength(v: Vec<D>, l: number): Vec<D>;
    unit(v: Vec<D>): Vec<D>;
    mix(w: number, v1: Vec<D>, v2: Vec<D>): Vec<D>;
    weightedSum(w1: number, v1: Vec<D>, w2: number, v2: Vec<D>): Vec<D>;
    angle(v1: Vec<D>, v2: Vec<D>): number;
    prod(v: Vec<D>, m: Mat<D>): Vec<D>;
    project(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    reject(v1: Vec<D>, v2: Vec<D>): Vec<D>;
}
declare abstract class VecMathBase<D extends Dim> implements VecMath<D> {
    of(...components: Vec<D>): Vec<D>;
    protected abstract get mutable(): MutableVecMathBase<D>;
    protected abstract get immutable(): ImmutableVecMathBase<D>;
    abstract from(array: NumberArray, offset?: number): Vec<D>;
    abstract gen(...components: [() => number] | Tuple<() => number, D>): () => Vec<D>;
    abstract add(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    abstract sub(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    abstract mul(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    abstract div(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    abstract scale(v: Vec<D>, f: number): Vec<D>;
    abstract max(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    abstract min(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    abstract addAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    abstract subAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    abstract maxAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    abstract minAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    abstract neg(v: Vec<D>): Vec<D>;
    abstract swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, D>): Vec<D>;
    abstract dot(v1: Vec<D>, v2: Vec<D>): number;
    abstract prod(v: Vec<D>, m: Mat<D>): Vec<D>;
    abstract project(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    abstract reject(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    lengthSquared(v: Vec<D>): number;
    length(v: Vec<D>): number;
    setLength(v: Vec<D>, l: number): Vec<D>;
    unit(v: Vec<D>): Vec<D>;
    mix(w: number, v1: Vec<D>, v2: Vec<D>): Vec<D>;
    weightedSum(w1: number, v1: Vec<D>, w2: number, v2: Vec<D>): Vec<D>;
    angle(v1: Vec<D>, v2: Vec<D>): number;
}
export declare abstract class ImmutableVecMathBase<D extends Dim> extends VecMathBase<D> {
    addAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    subAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    maxAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    minAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    project(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    reject(v1: Vec<D>, v2: Vec<D>): Vec<D>;
}
export declare class ImmutableVec4Math extends ImmutableVecMathBase<4> {
    protected get mutable(): MutableVecMathBase<4>;
    protected get immutable(): ImmutableVecMathBase<4>;
    from(array: NumberArray, offset?: number): Vec4;
    gen(...components: [() => number] | Tuple<() => number, 4>): () => Vec4;
    add(v1: Vec4, v2: Vec4): Vec4;
    sub(v1: Vec4, v2: Vec4): Vec4;
    mul(v1: Vec4, v2: Vec4): Vec4;
    div(v1: Vec4, v2: Vec4): Vec4;
    scale(v: Vec4, f: number): Vec4;
    max(v1: Vec4, v2: Vec4): Vec4;
    min(v1: Vec4, v2: Vec4): Vec4;
    neg(v: Vec4): Vec4;
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, 4>): Vec4;
    dot(v1: Vec4, v2: Vec4): number;
    prod(v: Vec4, m: Mat4): Vec4;
}
export declare class ImmutableVec3Math extends ImmutableVecMathBase<3> {
    protected get mutable(): MutableVecMathBase<3>;
    protected get immutable(): ImmutableVecMathBase<3>;
    from(array: NumberArray, offset?: number): Vec3;
    gen(...components: [() => number] | Tuple<() => number, 3>): () => Vec3;
    add(v1: Vec3, v2: Vec3): Vec3;
    sub(v1: Vec3, v2: Vec3): Vec3;
    mul(v1: Vec3, v2: Vec3): Vec3;
    div(v1: Vec3, v2: Vec3): Vec3;
    scale(v: Vec3, f: number): Vec3;
    max(v1: Vec3, v2: Vec3): Vec3;
    min(v1: Vec3, v2: Vec3): Vec3;
    neg(v: Vec3): Vec3;
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, 3>): Vec3;
    dot(v1: Vec3, v2: Vec3): number;
    cross(v1: Vec3, v2: Vec3): Vec3;
    prod(v: Vec3, m: Mat3): Vec3;
    equal(v1: Vec3, v2: Vec3, precision?: number): boolean;
}
export declare class ImmutableVec2Math extends ImmutableVecMathBase<2> {
    protected get mutable(): MutableVecMathBase<2>;
    protected get immutable(): ImmutableVecMathBase<2>;
    from(array: NumberArray, offset?: number): Vec2;
    gen(...components: [() => number] | Tuple<() => number, 2>): () => Vec2;
    add(v1: Vec2, v2: Vec2): Vec2;
    sub(v1: Vec2, v2: Vec2): Vec2;
    mul(v1: Vec2, v2: Vec2): Vec2;
    div(v1: Vec2, v2: Vec2): Vec2;
    scale(v: Vec2, f: number): Vec2;
    max(v1: Vec2, v2: Vec2): Vec2;
    min(v1: Vec2, v2: Vec2): Vec2;
    neg(v: Vec2): Vec2;
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, 2>): Vec2;
    dot(v1: Vec2, v2: Vec2): number;
    prod(v: Vec2, m: Mat2): Vec2;
    cross(v1: Vec2, v2: Vec2): number;
    equal(v1: Vec2, v2: Vec2, precision?: number): boolean;
}
export declare abstract class MutableVecMathBase<D extends Dim> extends VecMathBase<D> {
    from(array: NumberArray, offset?: number): DimMap<D, [number, number], [number, number, number], [number, number, number, number]>;
    addAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    subAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    maxAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    minAll(v: Vec<D>, ...vs: Vec<D>[]): Vec<D>;
    gen(...components: [() => number] | Tuple<() => number, D>): () => Vec<D>;
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, D>): Vec<D>;
    dot(v1: Vec<D>, v2: Vec<D>): number;
    prod(v: Vec<D>, m: Mat<D>): Vec<D>;
    project(v1: Vec<D>, v2: Vec<D>): Vec<D>;
    reject(v1: Vec<D>, v2: Vec<D>): Vec<D>;
}
export declare class MutableVec4Math extends MutableVecMathBase<4> {
    get mutable(): MutableVecMathBase<4>;
    get immutable(): ImmutableVecMathBase<4>;
    add(v1: Vec4, v2: Vec4): Vec4;
    sub(v1: Vec4, v2: Vec4): Vec4;
    mul(v1: Vec4, v2: Vec4): Vec4;
    div(v1: Vec4, v2: Vec4): Vec4;
    scale(v: Vec4, f: number): Vec4;
    max(v1: Vec4, v2: Vec4): Vec4;
    min(v1: Vec4, v2: Vec4): Vec4;
    neg(v: Vec4): Vec4;
}
export declare class MutableVec3Math extends MutableVecMathBase<3> {
    get mutable(): MutableVecMathBase<3>;
    get immutable(): ImmutableVecMathBase<3>;
    add(v1: Vec3, v2: Vec3): Vec3;
    sub(v1: Vec3, v2: Vec3): Vec3;
    mul(v1: Vec3, v2: Vec3): Vec3;
    div(v1: Vec3, v2: Vec3): Vec3;
    scale(v: Vec3, f: number): Vec3;
    max(v1: Vec3, v2: Vec3): Vec3;
    min(v1: Vec3, v2: Vec3): Vec3;
    neg(v: Vec3): Vec3;
}
export declare class MutableVec2Math extends MutableVecMathBase<2> {
    get mutable(): MutableVecMathBase<2>;
    get immutable(): ImmutableVecMathBase<2>;
    add(v1: Vec2, v2: Vec2): Vec2;
    sub(v1: Vec2, v2: Vec2): Vec2;
    mul(v1: Vec2, v2: Vec2): Vec2;
    div(v1: Vec2, v2: Vec2): Vec2;
    scale(v: Vec2, f: number): Vec2;
    max(v1: Vec2, v2: Vec2): Vec2;
    min(v1: Vec2, v2: Vec2): Vec2;
    neg(v: Vec2): Vec2;
}
export declare const vec2: ImmutableVec2Math;
export declare const vec3: ImmutableVec3Math;
export declare const vec4: ImmutableVec4Math;
export declare const mutVec2: MutableVec2Math;
export declare const mutVec3: MutableVec3Math;
export declare const mutVec4: MutableVec4Math;
export declare function deleteComponent<T, D extends Dim>(tuple: Tuple<T, D>, component: Component<D>): Tuple<T, LowerDim<D>>;
export {};
