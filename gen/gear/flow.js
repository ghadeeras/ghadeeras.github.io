import { compositeConsumer, causeEffectLink } from "./utils.js";
import { map, filter, reduce, defaultsTo } from "./effects.js";
export class BaseSource {
    flow() {
        return Flow.from(this);
    }
    to(...sinks) {
        const sink = new CompositeSink(sinks);
        this.producer(sink.consumer);
    }
}
export class CompositeSource extends BaseSource {
    constructor(sources) {
        super();
        this.sources = sources;
        const producers = this.sources.map(source => source.producer);
        this._producer = compositeConsumer(...producers);
    }
    get producer() {
        return this._producer;
    }
}
export class CompositeSink {
    constructor(sinks) {
        this.sinks = sinks;
        const consumers = this.sinks.map(sink => sink.consumer);
        this._consumer = compositeConsumer(...consumers);
    }
    get consumer() {
        return this._consumer;
    }
}
export class Value extends BaseSource {
    constructor(_value = null) {
        super();
        this._value = _value;
        this.consumers = [];
    }
    get value() {
        return this._value;
    }
    set value(newValue) {
        this.setValue(newValue);
    }
    setValue(newValue) {
        this._value = newValue;
        this.notify(this.consumers);
    }
    supply(...consumers) {
        this.consumers.push(...consumers);
        try {
            this.notify(consumers);
        }
        catch (e) {
            console.log(e);
        }
        return this;
    }
    notify(consumers) {
        for (const consumer of consumers) {
            consumer(this._value);
        }
    }
    get consumer() {
        return value => this.setValue(value);
    }
    get producer() {
        return consumer => this.supply(consumer);
    }
    static setOf(...values) {
        return new ValueSet(values);
    }
}
export class ValueSet extends BaseSource {
    constructor(values) {
        super();
        this.source = new CompositeSource(values);
        this.sink = new CompositeSink(values);
    }
    get producer() {
        return this.source.producer;
    }
    get consumer() {
        return this.sink.consumer;
    }
}
export class Flow extends BaseSource {
    constructor(output) {
        super();
        this.output = output;
    }
    filter(predicate) {
        return this.then(filter(predicate));
    }
    map(mapper) {
        return this.then(map(mapper));
    }
    reduce(reducer, identity) {
        return this.then(reduce(reducer, identity));
    }
    defaultsTo(value) {
        return this.through(defaultsTo(value), value);
    }
    then(effect, defaultValue = null) {
        const safeEffect = defaultValue != null ?
            (value, resultConsumer) => effect(value != null ? value : defaultValue, resultConsumer) :
            (value, resultConsumer) => (value != null) ? effect(value, resultConsumer) : {};
        return this.through(safeEffect);
    }
    through(effect, defaultValue = null) {
        const newOutput = new Value(defaultValue);
        causeEffectLink(this.output, effect, newOutput.consumer);
        return new Flow(newOutput.producer);
    }
    branch(...flowBuilders) {
        flowBuilders.forEach(builder => builder(this));
        return this;
    }
    get producer() {
        return this.output;
    }
    static from(...sources) {
        const source = new CompositeSource(sources);
        return new Flow(source.producer);
    }
}
export function consumerFlow(flowBuilder) {
    return sinkFlow(flowBuilder).consumer;
}
export function sinkFlow(flowBuilder) {
    const value = new Value();
    Flow.from(value).branch(flowBuilder);
    return value;
}
export function sink(consumer) {
    return { consumer: consumer };
}
//# sourceMappingURL=flow.js.map