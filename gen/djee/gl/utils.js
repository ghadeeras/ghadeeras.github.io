export function failure(message) {
    throw new Error(message);
}
export function lazily(constructor) {
    const ref = {};
    return () => {
        if (ref.value == undefined) {
            const value = constructor();
            ref.value = value;
            return value;
        }
        else {
            return ref.value;
        }
    };
}
export function values(record) {
    const result = [];
    for (let key in record) {
        result.push(record[key]);
    }
    return result;
}
//# sourceMappingURL=utils.js.map