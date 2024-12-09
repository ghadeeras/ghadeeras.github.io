import * as types from "./types.js";
export declare class Value<T> {
    private consumers;
    private compositeConsumer;
    constructor(producer?: types.Producer<T> | null);
    flow(value: T): void;
    attach(consumer: types.Consumer<T>): Value<T>;
    defaultsTo(value: T): Value<T>;
    then<R>(effect: types.Effect<T, R>): Value<R>;
    map<R>(mapper: types.Mapper<T, R>): Value<R>;
    reduce<R>(reducer: types.Reducer<T, R>, identity: R): Value<R>;
    filter(predicate: types.Predicate<T>): Value<T>;
    later(): Value<T>;
    switch<V extends Record<string, Value<T>>>(controller: Value<string>, values: V): Value<T>;
    static from<T>(...values: Value<T>[]): Value<T>;
}
export declare class Source<T> {
    private lazyValue;
    constructor(supplier: types.Supplier<Value<T>>);
    get value(): Value<T>;
    map<R>(mapper: types.Mapper<Value<T>, Value<R>>): Source<R>;
    static from<T>(producer: types.Producer<T>): Source<T>;
    static fromEvent<K extends types.Key, E>(object: types.Contains<K, types.EventHandler<E>>, key: K, adapter?: types.UnaryOperator<types.Consumer<E>>): Source<E>;
}
export declare class Target<T> {
    private consumer;
    private _value;
    constructor(consumer: types.Consumer<T>);
    get value(): Value<T> | null;
    set value(v: Value<T> | null);
}
export declare function sourceSwitch<V, S extends Record<string, Value<V>>>(controller: Value<string>, sources: S): Value<V>;
export declare function targetSwitch<V, T extends Record<string, Target<V>>>(controller: Value<string>, targets: T): Target<V>;
export declare function bind<T, K extends keyof T, V extends T[K]>(target: T, key: K, value: Value<V>): void;
export type ValuesMapping<T> = {
    [K in keyof T]: Value<T[K]>;
};
export type ValuesMappingFunction<T> = <K extends keyof T>(k: K) => Value<T[K]>;
export declare function join<T>(initialValue: T, values: ValuesMapping<T>): Value<T>;
export declare function fork<T>(value: Value<T>): ValuesMappingFunction<T>;
