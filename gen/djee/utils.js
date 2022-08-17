export function failure(message) {
    throw new Error(message);
}
export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
export function lazily(constructor) {
    const ref = {};
    return () => ref.value === undefined ?
        ref.value = constructor() :
        ref.value;
}
export function values(record) {
    const result = [];
    for (const key in record) {
        result.push(record[key]);
    }
    return result;
}
//# sourceMappingURL=utils.js.map