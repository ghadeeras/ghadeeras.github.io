module Gear {

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
            this.notify(consumers);
            return this;
        }

        private notify(consumers: Consumer<T>[]) {
            for (const consumer of consumers) {
                consumer(this.value);
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

}