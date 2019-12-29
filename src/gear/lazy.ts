module Gear {

    class Lazy<T> {

        private _value: T = null;

        constructor(private readonly supplier: Supplier<T>) {
        }

        get(): T {
            if (!this._value) {
                this._value = this.supplier();
            }
            return this._value;
        }

    }

    export function lazy<T>(constructor: Supplier<T>): Supplier<T> {
        let lazy = new Lazy(constructor);
        return () => lazy.get();
    }

}