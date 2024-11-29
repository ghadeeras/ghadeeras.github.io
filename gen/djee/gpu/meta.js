var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    create(device, label) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.object === null
                ? this.object = this.factory(device, label)
                : this.object;
            return yield result;
        });
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
function create(device, label, descriptor) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        for (const k of Object.keys(descriptor)) {
            const key = k;
            const value = descriptor[k];
            const newLabel = `${label}.${k}`;
            result[key] =
                value instanceof Definition ? yield value.create(device, newLabel)
                    : value instanceof GPUObject ? value
                        : yield create(device, newLabel, value);
        }
        return result;
    });
}
//# sourceMappingURL=meta.js.map