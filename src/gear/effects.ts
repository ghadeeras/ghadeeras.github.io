import { Reducer, Effect, Mapper, Predicate, Callable } from "./utils.js"
import { Source, sink } from "./flow.js"
import { Call } from "./call.js"

export function reduce<T, R>(reducer: Reducer<T, R>, identity: R): Effect<T, R> {
    const accumulator: R[] = [identity];
    return (value, result) => result(accumulator[0] = reducer(value, accumulator[0]));
}

export function map<T, R>(mapper: Mapper<T, R>): Effect<T, R> {
    return (value, result) => result(mapper(value));
}

export function filter<T>(predicate: Predicate<T>): Effect<T, T> {
    return (value, result) => {
        if (predicate(value)) {
            result(value);
        }
    }
}

export function later<T>(): Effect<T, T> {
    const consumerRef: Callable[] = [() => {}];
    const call = new Call(() => consumerRef[0]());
    return (value, result) => {
        consumerRef[0] = () => result(value);
        call.later();
    }
}

export function flowSwitch<T>(on: Source<boolean>, initialState: boolean = false): Effect<T, T> {
    const onRef: boolean[] = [initialState];
    on.to(sink(value => { onRef[0] = value }));
    return filter(value => onRef[0]);
}

export function repeater<T, R extends T>(interval: number, restValue: R): Effect<T, T> {
    const valueRef: T[] = [restValue];
    const timerRef: number[] = [];
    return (newValue, consumer) => {
        if (newValue != null && newValue != restValue) {
            valueRef[0] = newValue;
            timerRef.push(setInterval(() => consumer(valueRef[0]), interval));
        } else {
            valueRef[0] = restValue;
            clearInterval(timerRef.pop())
        }
        consumer(newValue);
    };
}

export function choice<T>(truwValue: T, falseValue: T): Effect<boolean, T> {
    return map(v => v ? truwValue : falseValue);
}
