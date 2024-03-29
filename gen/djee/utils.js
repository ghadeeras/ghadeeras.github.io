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
export function timeOut(promise, timeInMilliseconds, tag) {
    return new Promise((resolve, reject) => {
        const id = [setTimeout(() => {
                id[0] = null;
                reject(new Error(`[${tag}] Timed out after ${timeInMilliseconds} milliseconds!`));
            }, timeInMilliseconds)];
        promise
            .then(value => {
            if (id[0] !== null) {
                clearTimeout(id[0]);
                resolve(value);
            }
        })
            .catch(reason => {
            if (id[0] !== null) {
                clearTimeout(id[0]);
                reject(reason);
            }
        });
    });
}
//# sourceMappingURL=utils.js.map