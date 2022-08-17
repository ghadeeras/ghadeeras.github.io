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