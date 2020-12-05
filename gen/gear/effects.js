import { sink } from "./flow.js";
import { Call } from "./call.js";
export function reduce(reducer, identity) {
    const accumulator = [identity];
    return (value, result) => result(accumulator[0] = reducer(value, accumulator[0]));
}
export function map(mapper) {
    return (value, result) => result(mapper(value));
}
export function filter(predicate) {
    return (value, result) => {
        if (predicate(value)) {
            result(value);
        }
    };
}
export function later() {
    const consumerRef = [() => { }];
    const call = new Call(() => consumerRef[0]());
    return (value, result) => {
        consumerRef[0] = () => result(value);
        call.later();
    };
}
export function flowSwitch(on, initialState = false) {
    const onRef = [initialState];
    on.to(sink(value => { onRef[0] = value; }));
    return filter(value => onRef[0]);
}
export function repeater(interval, restValue) {
    const valueRef = [restValue];
    const timerRef = [];
    return (newValue, consumer) => {
        if (newValue != null && newValue != restValue) {
            valueRef[0] = newValue;
            timerRef.push(setInterval(() => consumer(valueRef[0]), interval));
        }
        else {
            valueRef[0] = restValue;
            clearInterval(timerRef.pop());
        }
        consumer(newValue);
    };
}
export function defaultsTo(value) {
    return map(v => v != null ? v : value);
}
export function choice(truwValue, falseValue) {
    return map(v => v ? truwValue : falseValue);
}
//# sourceMappingURL=effects.js.map