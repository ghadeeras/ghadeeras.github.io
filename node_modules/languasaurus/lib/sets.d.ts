export interface SymbolSet<T> {
    contains(value: T): boolean;
    random(): T;
}
