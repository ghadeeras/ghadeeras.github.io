export class DeferredComputation {
    constructor(computation) {
        this.computation = computation;
        this.promise = null;
    }
    perform() {
        if (this.promise == null) {
            this.promise = new Promise((resolve, reject) => setTimeout(() => {
                this.performNow(resolve, reject);
            }));
        }
        return this.promise;
    }
    performNow(resolve, reject) {
        if (this.promise == null) {
            throw new Error("Failed to defer calculation!");
        }
        this.promise = null;
        try {
            resolve(this.computation());
        }
        catch (e) {
            reject(e);
        }
    }
}
export function invokeLater(f, ...args) {
    const computation = new DeferredComputation(() => f(...args));
    return computation.perform();
}
