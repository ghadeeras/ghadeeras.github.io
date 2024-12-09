import { Supplier } from "./types.js";
export declare class DeferredComputation<R> {
    private computation;
    private promise;
    constructor(computation: Supplier<R>);
    perform(): Promise<R>;
    private performNow;
}
export declare function invokeLater<A extends any[], R>(f: (...args: A) => R, ...args: A): Promise<R>;
