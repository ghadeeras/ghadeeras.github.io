import { Reducer, Effect, Mapper, Predicate, Producer, Consumer, compositeConsumer, causeEffectLink } from "./utils.js"
import { map, filter, reduce, defaultsTo } from "./effects.js"

export interface Source<T> {

    readonly producer: Producer<T>

    to(...sinks: Sink<T>[]): void;

}

export interface Sink<T> {

    readonly consumer: Consumer<T>;

}

export abstract class BaseSource<T> implements Source<T> {

    abstract get producer(): Producer<T>;

    flow() {
        return Flow.from(this);
    }

    to(...sinks: Sink<T>[]) {
        const sink = new CompositeSink(sinks);
        this.producer(sink.consumer);
    }

} 

export class CompositeSource<T> extends BaseSource<T> {

    private readonly _producer: Producer<T>
    
    constructor(private readonly sources: Source<T>[]) {
        super();
        const producers: Producer<T>[] = this.sources.map(source => source.producer); 
        this._producer = compositeConsumer(...producers);
    }

    get producer(): Producer<T> {
        return this._producer;
    }

}

export class CompositeSink<T> implements Sink<T> {

    private readonly _consumer: Consumer<T>;
    
    constructor(private readonly sinks: Sink<T>[]) {
        const consumers: Consumer<T>[] = this.sinks.map(sink => sink.consumer);
        this._consumer = compositeConsumer(...consumers);
    }

    get consumer(): Consumer<T> {
        return this._consumer;
    }

}

export class Value<T> extends BaseSource<T> implements Sink<T> {

    private readonly consumers: Consumer<T>[] = [];
    
    constructor(private _value: T = null) {
        super();
    }

    get value() {
        return this._value;
    }

    set value(newValue: T) {
        this.setValue(newValue);
    }

    private setValue(newValue: T) {
        this._value = newValue;
        this.notify(this.consumers);
    }

    supply(...consumers: Consumer<T>[]) {
        this.consumers.push(...consumers);
        try {
            this.notify(consumers);
        } catch (e) {
            console.log(e);
        }
        return this;
    }

    private notify(consumers: Consumer<T>[]) {
        for (const consumer of consumers) {
            consumer(this._value);
        }
    }

    get consumer(): Consumer<T> {
        return value => this.setValue(value);
    }

    get producer(): Producer<T> {
        return consumer => this.supply(consumer);
    }

    static setOf<C>(...values: Value<C>[]): ValueSet<C> {
        return new ValueSet(values);
    }

}

export class ValueSet<T> extends BaseSource<T> implements Sink<T> {

    private readonly source: Source<T>
    private readonly sink: Sink<T>

    constructor(values: Value<T>[]) {
        super();
        this.source = new CompositeSource(values);
        this.sink = new CompositeSink(values);
    }

    get producer(): Producer<T> {
        return this.source.producer;
    }

    get consumer(): Consumer<T> {
        return this.sink.consumer;
    }

}

export class Flow<T> extends BaseSource<T> {

    private constructor(private readonly output: Producer<T>) {
        super();
    }

    filter(predicate: Predicate<T>) {
        return this.then(filter(predicate));
    }

    map<R>(mapper: Mapper<T, R>) {
        return this.then(map(mapper));
    }

    reduce<R>(reducer: Reducer<T, R>, identity: R) {
        return this.then(reduce(reducer, identity));
    }

    defaultsTo(value: T) {
        return this.through(defaultsTo(value), value);
    }

    then<R>(effect: Effect<T, R>, defaultValue: T = null) {
        const safeEffect: Effect<T, R> = defaultValue != null ? 
            (value, resultConsumer) => effect(value != null ? value : defaultValue, resultConsumer) :
            (value, resultConsumer) => (value != null) ? effect(value, resultConsumer) : {}; 
        return this.through(safeEffect);
    }

    through<R>(effect: Effect<T, R>, defaultValue: R = null) {
        const newOutput = new Value<R>(defaultValue);
        causeEffectLink(this.output, effect, newOutput.consumer);
        return new Flow(newOutput.producer);
    }

    branch(...flowBuilders: Consumer<Flow<T>>[]) {
        flowBuilders.forEach(builder => builder(this));
        return this;
    }

    get producer() {
        return this.output;
    }

    static from<T>(...sources: Source<T>[]) {
        const source = new CompositeSource(sources);
        return new Flow(source.producer);
    }

}

export function consumerFlow<T>(flowBuilder: Consumer<Flow<T>>): Consumer<T> {
    return sinkFlow(flowBuilder).consumer;
}

export function sinkFlow<T>(flowBuilder: Consumer<Flow<T>>): Sink<T> {
    const value = new Value<T>();
    Flow.from(value).branch(flowBuilder);
    return value;
}

export function sink<T>(consumer: Consumer<T>): Sink<T> {
    return { consumer : consumer }
}
