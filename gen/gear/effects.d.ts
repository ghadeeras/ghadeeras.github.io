import { Reducer, Effect, Mapper, Predicate } from "./utils.js";
import { Source } from "./flow.js";
export declare function reduce<T, R>(reducer: Reducer<T, R>, identity: R): Effect<T, R>;
export declare function map<T, R>(mapper: Mapper<T, R>): Effect<T, R>;
export declare function filter<T>(predicate: Predicate<T>): Effect<T, T>;
export declare function later<T>(): Effect<T, T>;
export declare function flowSwitch<T>(on: Source<boolean>, initialState?: boolean): Effect<T, T>;
export declare function repeater<T>(interval: number, restValue: T): Effect<T, T>;
export declare function defaultsTo<T>(value: T): Effect<T, T>;
export declare function choice<T>(truwValue: T, falseValue: T): Effect<boolean, T>;
//# sourceMappingURL=effects.d.ts.map