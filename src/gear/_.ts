/// <reference path="lazy.ts" />
/// <reference path="call.ts" />
/// <reference path="flow.ts" />
/// <reference path="value.ts" />
/// <reference path="effects.ts" />
/// <reference path="ui-input.ts" />
/// <reference path="ui-output.ts" />

module Gear {
    
    export type Callable = () => void;

    export type Supplier<T> = () => T;

    export type Consumer<T> = (input: T) => void;
    export type Producer<T> = Consumer<Consumer<T>>;

    export type Reducer<T, R> = (value: T, accumulator: R) => R;
    export type Mapper<T, R> = (value: T) => R;
    export type Predicate<T> = Mapper<T, boolean>;

    export type Effect<C, E> = (value: C, result: Consumer<E>) => void;

    export function intact<T>(): Mapper<T, T> {
        return value => value;
    }

    export function compositeConsumer<T>(...consumers: Consumer<T>[]): Consumer<T> {
        switch (consumers.length) {
            case 0: return () => {};
            case 1: return consumers[0];
            default: return value => { 
                for (const consumer of consumers) {
                    consumer(value); 
                }
            }
        }
    }

    export function causeEffectLink<C, E>(causeProducer: Producer<C>, effect: Effect<C, E>, effectConsumer: Consumer<E>): void {
        return causeProducer(cause => effect(cause, effectConsumer));
    }

    export function load(path: string, onready: Gear.Callable, ...files: [string, Consumer<string>][]) {
        const remaining: number[] = [files.length];
        for (let [file, consumer] of files) {
            fetchFile(path + "/" + file, content => {
                consumer(content);
                remaining[0]--;
                if (remaining[0] <= 0) {
                    onready();
                }
            });
        }
    }

    function fetchFile(url: string, consumer: Gear.Consumer<string>) {
        fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text().then(consumer));
    }

}