export class GPUObject {
    definition() {
        return new Definition(() => this);
    }
}
export class Definition {
    constructor(factory) {
        this.factory = factory;
        this.object = null;
    }
    async create(device, label) {
        const result = this.object === null
            ? this.object = this.factory(device, label)
            : this.object;
        return await result;
    }
    static from(descriptor) {
        return new Definition((device, label) => create(device, label, descriptor));
    }
    static of(object) {
        return new Definition(() => object);
    }
    static device() {
        return new Definition(device => device);
    }
}
async function create(device, label, descriptor) {
    const result = {};
    for (const k of Object.keys(descriptor)) {
        const key = k;
        const value = descriptor[k];
        const newLabel = `${label}.${k}`;
        result[key] =
            value instanceof Definition ? await value.create(device, newLabel)
                : value instanceof GPUObject ? value
                    : await create(device, newLabel, value);
    }
    return result;
}
//# sourceMappingURL=meta.js.map