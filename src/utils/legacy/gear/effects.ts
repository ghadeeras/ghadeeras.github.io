import * as gear from "gear";
import { Value } from "./value.js";

export function reduction<T, R>(reducer: gear.Reducer<T, R>, identity: R): gear.Effect<T, R> {
    const accumulator: [R] = [identity];
    return (value, resultConsumer) => resultConsumer(accumulator[0] = reducer(accumulator[0], value));
}

export function mapping<T, R>(mapper: gear.Mapper<T, R>): gear.Effect<T, R> {
    return (value, resultConsumer) => resultConsumer(mapper(value));
}

export function filtering<T>(predicate: gear.Predicate<T>): gear.Effect<T, T> {
    return (value, resultConsumer) => {
        if (predicate(value)) {
            resultConsumer(value);
        }gear
    }
}

export function latency<T>(): gear.Effect<T, T> {
    return (value, resultConsumer) => {
        gear.invokeLater(resultConsumer, value)
    }
}

export function propagation<A, B, C>(e1: gear.Effect<A, B>, e2: gear.Effect<B, C>): gear.Effect<A, C> {
    return (a, cConsumer) => e1(a, b => e2(b, cConsumer))
}

export function flowSwitch<T>(on: Value<boolean>, initialState: boolean = false): gear.Effect<T, T> {
    const onRef: [boolean] = [initialState];
    on.attach(value => { onRef[0] = value });
    return filtering(() => onRef[0]);
}

export function repeater<T, R extends T>(interval: number, restValue: R): gear.Effect<T, T> {
    const valueRef: T[] = [restValue];
    const timerRef: [number | null] = [null];
    return (newValue, consumer) => {
        if (newValue != null && newValue != restValue) {
            valueRef[0] = newValue;
            timerRef[0] = setInterval(() => consumer(newValue), interval);
        } else if (timerRef[0] != null) {
            clearInterval(timerRef[0])
            valueRef[0] = restValue;
            timerRef[0] = null
        }
        consumer(newValue);
    };
}

export function choice<T>(trueValue: T, falseValue: T): gear.Effect<boolean, T> {
    return mapping(v => v ? trueValue : falseValue);
}
