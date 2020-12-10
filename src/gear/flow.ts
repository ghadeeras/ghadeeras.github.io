import { Reducer, Effect, Mapper, Predicate, Producer, Consumer, compositeConsumer, causeEffectLink, intact } from "./utils.js"
import { map, filter, reduce } from "./effects.js"

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
    
    constructor(private initialValue: T | null = null) {
        super();
    }

    private setValue(value: T) {
        if (this.initialValue == null) {
            this.initialValue = value
        }
        this.notify(this.consumers, value);
    }

    private supply(...consumers: Consumer<T>[]) {
        this.consumers.push(...consumers);
        if (this.initialValue != null) {
            this.notify(consumers, this.initialValue)
        }
    }

    private notify(consumers: Consumer<T>[], value: T) {
        for (const consumer of consumers) {
            consumer(value);
        }
    }

    get consumer(): Consumer<T> {
        return value => this.setValue(value);
    }

    get producer(): Producer<T> {
        return consumer => this.supply(consumer);
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
        return this.through(reduce(reducer, identity), identity);
    }

    defaultsTo(value: T) {
        return this.through(map(intact()), value);
    }

    then<R>(effect: Effect<T, R>) {
        return this.through(effect);
    }

    through<R>(effect: Effect<T, R>, defaulValue: R | null = null) {
        const newOutput = new Value<R>(defaulValue);
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

export function sinkFlow<T>(flowBuilder: Consumer<Flow<T>>): Sink<T> {
    const value = new Value<T>();
    Flow.from(value).branch(flowBuilder);
    return value;
}

export function sink<T>(consumer: Consumer<T>): Sink<T> {
    return { consumer : consumer }
}
