import { Reducer, Effect, Mapper, Predicate, Producer, Consumer } from "./utils.js";
export interface Source<T> {
    readonly producer: Producer<T>;
    to(...sinks: Sink<T>[]): void;
}
export interface Sink<T> {
    readonly consumer: Consumer<T>;
}
export declare abstract class BaseSource<T> implements Source<T> {
    abstract get producer(): Producer<T>;
    flow(): Flow<T>;
    to(...sinks: Sink<T>[]): void;
}
export declare class CompositeSource<T> extends BaseSource<T> {
    private readonly sources;
    private readonly _producer;
    constructor(sources: Source<T>[]);
    get producer(): Producer<T>;
}
export declare class CompositeSink<T> implements Sink<T> {
    private readonly sinks;
    private readonly _consumer;
    constructor(sinks: Sink<T>[]);
    get consumer(): Consumer<T>;
}
export declare class Value<T> extends BaseSource<T> implements Sink<T> {
    private _value;
    private readonly consumers;
    constructor(_value?: T);
    get value(): T;
    set value(newValue: T);
    private setValue;
    supply(...consumers: Consumer<T>[]): this;
    private notify;
    get consumer(): Consumer<T>;
    get producer(): Producer<T>;
    static setOf<C>(...values: Value<C>[]): ValueSet<C>;
}
export declare class ValueSet<T> extends BaseSource<T> implements Sink<T> {
    private readonly source;
    private readonly sink;
    constructor(values: Value<T>[]);
    get producer(): Producer<T>;
    get consumer(): Consumer<T>;
}
export declare class Flow<T> extends BaseSource<T> {
    private readonly output;
    private constructor();
    filter(predicate: Predicate<T>): Flow<T>;
    map<R>(mapper: Mapper<T, R>): Flow<R>;
    reduce<R>(reducer: Reducer<T, R>, identity: R): Flow<R>;
    defaultsTo(value: T): Flow<T>;
    then<R>(effect: Effect<T, R>, defaultValue?: T): Flow<R>;
    through<R>(effect: Effect<T, R>, defaultValue?: R): Flow<R>;
    branch(...flowBuilders: Consumer<Flow<T>>[]): this;
    get producer(): Consumer<Consumer<T>>;
    static from<T>(...sources: Source<T>[]): Flow<T>;
}
export declare function consumerFlow<T>(flowBuilder: Consumer<Flow<T>>): Consumer<T>;
export declare function sinkFlow<T>(flowBuilder: Consumer<Flow<T>>): Sink<T>;
export declare function sink<T>(consumer: Consumer<T>): Sink<T>;
//# sourceMappingURL=flow.d.ts.map