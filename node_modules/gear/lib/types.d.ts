export type Callable = () => void;
export type Supplier<T> = () => T;
export type Consumer<T> = (input: T) => void;
export type Producer<T> = Consumer<Consumer<T>>;
export type Reducer<T, R> = (accumulator: R, value: T) => R;
export type Mapper<T, R> = (value: T) => R;
export type Predicate<T> = Mapper<T, boolean>;
export type UnaryOperator<T> = Mapper<T, T>;
export type Effect<C, E> = (value: C, result: Consumer<E>) => void;
export type Pair<A, B> = [A, B];
export type Key = keyof any;
export type Contains<K extends Key, V> = {
    [P in Key]: P extends K ? V : any;
};
export type EventHandler<E> = ((event: E) => any) | null;
export type Property<V> = {
    getter: () => V;
    setter: (value: V) => void;
};
