export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type KeyOfType<V, O> = FilteredKeysOf<O, keyof O, V>
export type FilteredKeysOf<O, K, V> = K extends keyof O 
    ? O[K] extends V ? K : never
    : never

export type Supplier<T> = () => T

export function failure<T>(message: string): T {
    throw new Error(message)
}

export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}

type Ref<T> = {
    value?: T
}

export function lazily<T>(constructor: Supplier<T>): Supplier<T> {
    const ref: Ref<T> = {}
    return () => ref.value === undefined ?
        ref.value = constructor() :
        ref.value
}

export function values<K extends string | number | symbol, V>(record: Record<K, V>): V[] {
    const result: V[] = []
    for (const key in record) {
        result.push(record[key])
    }
    return result
}

export function timeOut<T>(promise: Promise<T>, timeInMilliseconds: number, tag: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const id: [number | null] = [setTimeout(() => {
            id[0] = null
            reject(new Error(`[${tag}] Timed out after ${timeInMilliseconds} milliseconds!`))
        }, timeInMilliseconds)]

        promise
            .then(value => {
                if (id[0] !== null) {
                    clearTimeout(id[0])
                    resolve(value)
                }
            })
            .catch(reason => {
                if (id[0] !== null) {
                    clearTimeout(id[0])
                    reject(reason)
                }
            })
    })
}