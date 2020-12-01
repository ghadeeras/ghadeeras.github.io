class Lazy {
    constructor(supplier) {
        this.supplier = supplier;
        this._value = null;
    }
    get() {
        if (!this._value) {
            this._value = this.supplier();
        }
        return this._value;
    }
}
export function lazy(constructor) {
    let lazy = new Lazy(constructor);
    return () => lazy.get();
}
//# sourceMappingURL=lazy.js.map