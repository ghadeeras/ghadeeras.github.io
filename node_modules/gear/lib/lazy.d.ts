import { Supplier } from "./types.js";
export declare class Lazy<T> {
    private readonly supplier;
    private _value;
    constructor(supplier: Supplier<T>);
    get(): T;
    refresh(): void;
    asSupplier(): Supplier<T>;
}
export declare function lazy<T>(constructor: Supplier<T>): Supplier<T>;
