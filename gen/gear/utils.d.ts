export declare type Callable = () => void;
export declare type Supplier<T> = () => T;
export declare type Consumer<T> = (input: T) => void;
export declare type Producer<T> = Consumer<Consumer<T>>;
export declare type Reducer<T, R> = (value: T, accumulator: R) => R;
export declare type Mapper<T, R> = (value: T) => R;
export declare type Predicate<T> = Mapper<T, boolean>;
export declare type Effect<C, E> = (value: C, result: Consumer<E>) => void;
export declare function intact<T>(): Mapper<T, T>;
export declare function compositeConsumer<T>(...consumers: Consumer<T>[]): Consumer<T>;
export declare function causeEffectLink<C, E>(causeProducer: Producer<C>, effect: Effect<C, E>, effectConsumer: Consumer<E>): void;
export declare function load(path: string, onready: Callable, ...files: [string, Consumer<string>][]): void;
//# sourceMappingURL=utils.d.ts.map