export function intact() {
    return value => value;
}
export function constant(value) {
    return () => value;
}
export function compositeConsumer(...consumers) {
    switch (consumers.length) {
        case 0: return () => { };
        case 1: return consumers[0];
        default: return value => {
            for (const consumer of consumers) {
                consumer(value);
            }
        };
    }
}
export function compositeProducer(...producers) {
    switch (producers.length) {
        case 0: return () => { };
        case 1: return producers[0];
        default: return consumer => {
            for (const producer of producers) {
                producer(consumer);
            }
        };
    }
}
export function causeConsumer(effect, effectConsumer) {
    return cause => effect(cause, effectConsumer);
}
export function effectProducer(causeProducer, effect) {
    return effectConsumer => causeProducer(cause => effect(cause, effectConsumer));
}
export function circuit(producer, consumer) {
    return () => producer(consumer);
}
export function htmlElement(id) {
    return required(document.getElementById(id), () => `Element with id '${id}' was not found!'`);
}
export function required(value, message = () => `Required value is ${value}!`) {
    return value === null || value === undefined
        ? error(message())
        : value;
}
export function error(message) {
    throw new Error(message);
}
export function property(object, key) {
    return {
        getter: () => object[key],
        setter: value => object[key] = value
    };
}
export function trap(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
}
