module Gear {

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

    export function flowSwitch<T>(on: Source<boolean>): Effect<T, T> {
        const onRef: boolean[] = [true];
        on.to(sink(value => { onRef[0] = value }));
        return filter(value => onRef[0]);
    }

    export function defaultsTo<T>(value: T): Effect<T, T> {
        return map(v => v ? v : value);
    }

}