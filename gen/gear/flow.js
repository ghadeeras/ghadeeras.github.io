import { compositeConsumer, causeEffectLink, intact } from "./utils.js";
import { map, filter, reduce } from "./effects.js";
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
    constructor(initialValue = null) {
        super();
        this.initialValue = initialValue;
        this.consumers = [];
    }
    setValue(value) {
        if (this.initialValue == null) {
            this.initialValue = value;
        }
        this.notify(this.consumers, value);
    }
    supply(...consumers) {
        this.consumers.push(...consumers);
        if (this.initialValue != null) {
            this.notify(consumers, this.initialValue);
        }
    }
    notify(consumers, value) {
        for (const consumer of consumers) {
            consumer(value);
        }
    }
    get consumer() {
        return value => this.setValue(value);
    }
    get producer() {
        return consumer => this.supply(consumer);
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
        return this.through(reduce(reducer, identity), identity);
    }
    defaultsTo(value) {
        return this.through(map(intact()), value);
    }
    then(effect) {
        return this.through(effect);
    }
    through(effect, defaulValue = null) {
        const newOutput = new Value(defaulValue);
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
export function sinkFlow(flowBuilder) {
    const value = new Value();
    Flow.from(value).branch(flowBuilder);
    return value;
}
export function sink(consumer) {
    return { consumer: consumer };
}
//# sourceMappingURL=flow.js.map