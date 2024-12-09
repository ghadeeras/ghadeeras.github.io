import { invokeLater } from "./scheduling.js";
export function reduction(reducer, identity) {
    const accumulator = [identity];
    return (value, resultConsumer) => resultConsumer(accumulator[0] = reducer(accumulator[0], value));
}
export function mapping(mapper) {
    return (value, resultConsumer) => resultConsumer(mapper(value));
}
export function filtering(predicate) {
    return (value, resultConsumer) => {
        if (predicate(value)) {
            resultConsumer(value);
        }
    };
}
export function latency() {
    return (value, resultConsumer) => {
        invokeLater(resultConsumer, value);
    };
}
export function propagation(e1, e2) {
    return (a, cConsumer) => e1(a, b => e2(b, cConsumer));
}
export function flowSwitch(on, initialState = false) {
    const onRef = [initialState];
    on.attach(value => { onRef[0] = value; });
    return filtering(() => onRef[0]);
}
export function repeater(interval, restValue) {
    const valueRef = [restValue];
    const timerRef = [null];
    return (newValue, consumer) => {
        if (newValue != null && newValue != restValue) {
            valueRef[0] = newValue;
            timerRef[0] = setInterval(() => consumer(newValue), interval);
        }
        else if (timerRef[0] != null) {
            clearInterval(timerRef[0]);
            valueRef[0] = restValue;
            timerRef[0] = null;
        }
        consumer(newValue);
    };
}
export function choice(trueValue, falseValue) {
    return mapping(v => v ? trueValue : falseValue);
}
