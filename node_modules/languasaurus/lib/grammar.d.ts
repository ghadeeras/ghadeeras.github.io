import * as tokens from "./tokens.js";
import * as utils from "./utils.js";
export declare class Grammar<T> {
    readonly start: Symbol<T>;
    private optionality;
    private firstSets;
    private followSets;
    readonly symbols: Set<Symbol<any>>;
    constructor(start: Symbol<T>);
    private apply;
    isOptional<T>(symbol: Symbol<T>): boolean;
    firstSetOf<T>(symbol: Symbol<T>): TokenTypeSet;
    followSetOf<T>(symbol: Symbol<T>): TokenTypeSet;
    private notFound;
}
export type InferFrom<S extends Symbol<any>> = S extends Symbol<infer T> ? T : never;
export type InferFromProductions<P extends Repeatable<any>[]> = P extends [infer H extends Repeatable<any>] ? InferFrom<H> : P extends [infer H extends Repeatable<any>, ...infer T extends Repeatable<any>[]] ? InferFrom<H> | InferFromProductions<T> : never;
export type Structure<D extends Definition> = {
    [k in keyof D]: InferFrom<D[k]>;
};
export type TypedNode<T extends string, S> = {
    type: T;
    content: S;
};
export type Definition = Record<string, Symbol<any>>;
export type TokenTypeSet = Set<tokens.TokenType<any>>;
export declare function terminal<T>(tokenType: tokens.TokenType<T>): Terminal<T>;
export declare function choice<P extends [TypedRepeatable<any, any>, TypedRepeatable<any, any>, ...TypedRepeatable<any, any>[]]>(...productions: P): Choice<P>;
export declare function production<D extends Definition>(definition: D, order?: (keyof D)[]): Production<D>;
export declare function recursively<T, R extends Record<string, Symbol<any>>>(definition: (self: Repeatable<T>) => [Repeatable<T>, R]): R;
export interface Symbol<T> {
    size: number;
    accept<R>(visitor: Visitor<R>): R;
    random(): T;
    asyncRandom(evaluator: utils.LazyEvaluator, depth?: number): utils.SimplePromise<T>;
    tokens(value: T): Generator<tokens.Token<any>>;
}
export interface NonRepeatable<T> extends Symbol<T> {
    mapped<R>(toMapper: (v: T) => R, fromMapper: (v: R) => T): NonRepeatable<R>;
    typedAs<S extends string>(type: S): NonRepeatable<TypedNode<S, T>>;
}
export interface Repeatable<T> extends Symbol<T> {
    optional(): Optional<T>;
    zeroOrMore(): NonRepeatable<T[]>;
    oneOrMore(): NonRepeatable<[T, ...T[]]>;
    mapped<R>(toMapper: (v: T) => R, fromMapper: (v: R) => T): Repeatable<R>;
    typedAs<S extends string>(type: S): TypedRepeatable<S, T>;
}
export interface TypedRepeatable<T extends string, S> extends Repeatable<TypedNode<T, S>> {
    type: T;
}
export interface Optional<T> extends NonRepeatable<T | null> {
    readonly symbol: Repeatable<T>;
}
export interface Terminal<T> extends Repeatable<T> {
    readonly tokenType: tokens.TokenType<T>;
}
export interface Choice<P extends TypedRepeatable<any, any>[]> extends Repeatable<InferFromProductions<P>> {
    readonly productions: P;
}
export interface Production<D extends Definition> extends Repeatable<Structure<D>> {
    readonly definition: D;
    readonly order: (keyof D)[];
}
export interface Lazy<T> extends Repeatable<T> {
    readonly symbol: Symbol<T>;
}
export interface MappedNonRepeatable<S, T> extends NonRepeatable<T> {
    readonly symbol: NonRepeatable<S>;
    readonly toMapper: (v: S) => T;
    readonly fromMapper: (v: T) => S;
}
export interface MappedRepeatable<S, T> extends Repeatable<T> {
    readonly symbol: Repeatable<S>;
    readonly toMapper: (v: S) => T;
    readonly fromMapper: (v: T) => S;
}
export interface Visitor<R> {
    visitOptional<T>(symbol: Optional<T>): R;
    visitTerminal<T>(symbol: Terminal<T>): R;
    visitChoice<P extends TypedRepeatable<any, any>[]>(symbol: Choice<P>): R;
    visitProduction<D extends Definition>(symbol: Production<D>): R;
    visitLazy<S>(symbol: Lazy<S>): R;
    visitMappedNonRepeatable<S, T>(symbol: MappedNonRepeatable<S, T>): R;
    visitMappedRepeatable<S, T>(symbol: MappedRepeatable<S, T>): R;
}
