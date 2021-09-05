
export type Callable = () => void;

export type Supplier<T> = () => T;

export type Consumer<T> = (input: T) => void;
export type Producer<T> = Consumer<Consumer<T>>;

export type Reducer<T, R> = (value: T, accumulator: R) => R;
export type Mapper<T, R> = (value: T) => R;
export type Predicate<T> = Mapper<T, boolean>;

export type Effect<C, E> = (value: C, result: Consumer<E>) => void;

export function intact<T>(): Mapper<T, T> {
    return value => value;
}

export function compositeConsumer<T>(...consumers: Consumer<T>[]): Consumer<T> {
    switch (consumers.length) {
        case 0: return () => {};
        case 1: return consumers[0];
        default: return value => { 
            for (const consumer of consumers) {
                consumer(value); 
            }
        }
    }
}

export function causeEffectLink<C, E>(causeProducer: Producer<C>, effect: Effect<C, E>, effectConsumer: Consumer<E>): void {
    return causeProducer(cause => effect(cause, effectConsumer));
}

export type Pair<A, B> = [A, B]

export async function fetchFiles<K extends string, T extends Record<K, string>>(files: T, path: string = "."): Promise<T> {
    const result: Partial<Record<K, string>> = {};
    const keys = Object.keys(files) as K[];
    const promises = keys.map(k => fetchFile(k, `${path}/${files[k]}`))
    for (let [key, promise] of promises) {
        result[key] = await promise
    }
    return result as T
}

function fetchFile<K extends string>(key: K, url: string): Pair<K, Promise<string>> {
    return [key, fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text())]
}


export function load(path: string, onready: Callable, ...files: [string, Consumer<string>][]) {
    const remaining: number[] = [files.length];
    for (let [file, consumer] of files) {
        loadFile(path + "/" + file, content => {
            consumer(content);
            remaining[0]--;
            if (remaining[0] <= 0) {
                onready();
            }
        });
    }
}

function loadFile(url: string, consumer: Consumer<string>) {
    fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text().then(consumer));
}
