import * as effects from "./effects.js";
import * as gear from "gear";
export class Value {
    constructor(producer = null) {
        this.consumers = [];
        this.compositeConsumer = () => { };
        if (producer) {
            producer(value => this.compositeConsumer(value));
        }
    }
    flow(value) {
        this.compositeConsumer(value);
    }
    attach(consumer) {
        this.consumers.push(consumer);
        this.compositeConsumer = gear.compositeConsumer(...this.consumers);
        return this;
    }
    defaultsTo(value) {
        return new Value(consumer => {
            this.attach(consumer);
            gear.invokeLater(() => {
                consumer(value);
            });
        });
    }
    then(effect) {
        return new Value(effectConsumer => {
            this.attach(gear.causeConsumer(effect, effectConsumer));
        });
    }
    map(mapper) {
        return this.then(effects.mapping(mapper));
    }
    reduce(reducer, identity) {
        return this.then(effects.reduction(reducer, identity)).defaultsTo(identity);
    }
    filter(predicate) {
        return this.then(effects.filtering(predicate));
    }
    later() {
        return this.then(effects.latency());
    }
    switch(controller, values) {
        const noOp = new Value();
        const selectedValue = [noOp];
        controller.attach(key => selectedValue[0] = values[key] ?? noOp);
        this.attach(value => selectedValue[0].flow(value));
        return this;
    }
    static from(...values) {
        return new Value(consumer => {
            for (const value of values) {
                value.attach(consumer);
            }
        });
    }
}
export class Source {
    constructor(supplier) {
        this.lazyValue = gear.lazy(supplier);
    }
    get value() {
        return this.lazyValue();
    }
    map(mapper) {
        return new Source(() => mapper(this.lazyValue()));
    }
    static from(producer) {
        return new Source(() => new Value(producer));
    }
    static fromEvent(object, key, adapter = gear.intact()) {
        return Source.from(consumer => object[key] = adapter(consumer));
    }
}
export class Target {
    constructor(consumer) {
        this.consumer = consumer;
        this._value = null;
    }
    get value() {
        return this._value;
    }
    set value(v) {
        if (this._value) {
            throw new Error(v ? "Already bound!" : "Once bound, never unbound!");
        }
        if (v) {
            this._value = v;
            v.attach(this.consumer);
        }
    }
}
export function sourceSwitch(controller, sources) {
    const selectedSource = [null];
    controller.attach(key => selectedSource[0] = key);
    return new Value(consumer => {
        for (const key in sources) {
            sources[key].filter(value => selectedSource[0] === key).attach(consumer);
        }
    });
}
export function targetSwitch(controller, targets) {
    const noOp = () => { };
    const selectedTarget = [noOp];
    const consumers = {};
    for (const key in targets) {
        targets[key].value = new Value(c => consumers[key] = c);
    }
    controller.attach(key => selectedTarget[0] = consumers[key] ?? noOp);
    return new Target(value => selectedTarget[0](value));
}
export function bind(target, key, value) {
    value.attach(v => target[key] = v);
}
export function join(initialValue, values) {
    return new Join(initialValue, values);
}
export function fork(value) {
    const valuesMapping = {};
    return k => {
        let result = valuesMapping[k];
        if (!result) {
            result = value.map(value => value[k]);
            valuesMapping[k] = result;
        }
        return result;
    };
}
class Join extends Value {
    constructor(initialValue, values) {
        super(consumer => this.attachValues(values, consumer));
        this.value = { ...initialValue };
    }
    attachValues(values, consumer) {
        for (const key in values) {
            values[key].attach(v => {
                this.value[key] = v;
                consumer({ ...this.value });
            });
        }
    }
}
//# sourceMappingURL=value.js.map