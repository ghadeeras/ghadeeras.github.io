export function pair(key, value) {
    return {
        key: key,
        value: value
    };
}
export function distinctFunction(comparator) {
    return array => distinct(array, comparator);
}
export function distinct(array, comparator) {
    return aggregate(array, v => v, v => v, comparator, v => v, v => v).map(r => r.value);
}
export function groupFunction(key, value, keyComparator) {
    return array => group(array, key, value, keyComparator);
}
export function group(array, key, value, keyComparator) {
    return aggregate(array, key, value, keyComparator, () => new Array(), append);
}
export function aggregateFunction(keyComparator, aggregateIdentity, aggregateReducer) {
    return array => aggregate(array, r => r.key, r => r.value, keyComparator, aggregateIdentity, aggregateReducer);
}
export function aggregate(array, key, value, keyComparator, aggregateIdentity, aggregateReducer) {
    const result = [];
    const comparator = comparing(key, keyComparator);
    array.sort(comparator).forEach(item => {
        const k = key(item);
        const v = value(item);
        const lastItem = result.pop();
        if (lastItem) {
            if (keyComparator(lastItem.key, k) == 0) {
                result.push(pair(k, aggregateReducer(lastItem.value, v)));
            }
            else {
                result.push(lastItem);
                result.push(pair(k, aggregateReducer(aggregateIdentity(k), v)));
            }
        }
        else {
            result.push(pair(k, aggregateReducer(aggregateIdentity(k), v)));
        }
    });
    return result;
}
export function removeFirst(toRemove, array, comparator) {
    const index = array.findIndex(item => comparator(item, toRemove) == 0);
    return index >= 0 ? array.slice(0, index).concat(array.slice(index + 1)) : array;
}
export const numberComparator = (v1, v2) => v1 - v2;
export function arrayComparator(comparator) {
    return (array1, array2) => {
        const minLength = Math.min(array1.length, array2.length);
        let result = 0;
        for (let i = 0; i < minLength && result == 0; i++) {
            result = comparator(array1[i], array2[i]);
        }
        if (result == 0) {
            result = array1.length - array2.length;
        }
        return result;
    };
}
export function comparing(getter, comparator) {
    return (a1, a2) => comparator(getter(a1), getter(a2));
}
export function comparingBy(...comparators) {
    return (a1, a2) => {
        for (const comparator of comparators) {
            const diff = comparator(a1, a2);
            if (diff != 0) {
                return diff;
            }
        }
        return 0;
    };
}
export function flatten(array) {
    return flatMap(array, v => v);
}
export function flatMap(array, mapper) {
    const result = [];
    array.map(mapper).forEach(os => os.forEach(o => result.push(o)));
    return result;
}
export function unique(values) {
    const vs = [];
    for (const v of values) {
        if (vs.indexOf(v) < 0) {
            vs.push(v);
        }
    }
    return vs;
}
export function append(group, v) {
    group.push(v);
    return group;
}
export function randomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
export function bug() {
    throw new Error("Should never happen!!!");
}
export function evaluate(asyncExpression) {
    const evaluator = new LazyEvaluatorImpl();
    const promise = asyncExpression(expression => evaluator.evaluate(expression));
    return evaluator.await(promise);
}
class LazyEvaluatorImpl {
    constructor() {
        this.resolutions = [];
    }
    evaluate(expression) {
        return new SimplePromise(resolution => this.resolutions.push(resolution), consumer => this.resolutions.push(() => consumer(expression())));
    }
    await(promise) {
        const result = [];
        promise.then(value => result.push(value));
        while (this.resolutions.length > 0 && result.length == 0) {
            const resolution = this.resolutions.shift();
            if (resolution !== undefined) {
                resolution();
            }
        }
        if (result.length === 0) {
            throw new Error("Could not resolve promise!!!");
        }
        return result[0];
    }
}
export class SimplePromise {
    constructor(defer, producer) {
        this.defer = defer;
        this.result = [];
        this.consumers = [];
        producer(value => this.resolve(value));
    }
    resolve(value) {
        if (this.result.length > 0) {
            throw new Error("Only one resolution is expected!");
        }
        this.result.push(value);
        while (this.consumers.length > 0) {
            const consumer = this.consumers.shift();
            if (consumer !== undefined) {
                this.defer(() => consumer(value));
            }
        }
    }
    attach(consumer) {
        if (this.result.length > 0) {
            this.defer(() => consumer(this.result[0]));
        }
        else {
            this.consumers.push(consumer);
        }
    }
    then(mapper) {
        return new SimplePromise(this.defer, consumer => {
            this.attach(value => {
                const result = mapper(value);
                if (result instanceof SimplePromise) {
                    result.attach(consumer);
                }
                else {
                    consumer(result);
                }
            });
        });
    }
}
