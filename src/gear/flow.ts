module Gear {

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
            return this.through(defaultsTo(value));
        }

        then<R>(effect: Effect<T, R>, defaultValue: T = null) {
            const safeEffect: Effect<T, R> = defaultValue != null ? 
                (value, resultConsumer) => effect(value != null ? value : defaultValue, resultConsumer) :
                (value, resultConsumer) => (value != null) ? effect(value, resultConsumer) : {}; 
            return this.through(safeEffect);
        }

        through<R>(effect: Effect<T, R>) {
            const newOutput = new Value<R>();
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

}