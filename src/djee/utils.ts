export type Supplier<T> = () => T

export function failure<T>(message: string): T {
    throw new Error(message)
}

type Ref<T> = {
    value?: T
}

export function lazily<T>(constructor: Supplier<T>): Supplier<T> {
    const ref: Ref<T> = {}
    return () => {
        if (ref.value == undefined) {
            const value = constructor()
            ref.value = value
            return value
        } else {
            return ref.value
        }
    }
}

export function values<K extends string | number | symbol, V>(record: Record<K, V>): V[] {
    const result: V[] = []
    for (let key in record) {
        result.push(record[key])
    }
    return result
}