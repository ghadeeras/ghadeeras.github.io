var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Definition, GPUObject } from "./meta.js";
export class BindGroupLayout extends GPUObject {
    constructor(label, device, entries) {
        super();
        this.device = device;
        this.entries = entries;
        const entryList = [];
        for (const key of Object.keys(entries)) {
            entryList.push(entries[key]);
        }
        this.descriptor = {
            label,
            entries: entryList
        };
        this.wrapped = device.device.createBindGroupLayout(this.descriptor);
    }
    static from(descriptor) {
        return new Definition((device, label) => new BindGroupLayout(label, device, descriptor.entries));
    }
    instance(label, entries) {
        return new BindGroup(label, this, entries);
    }
    asGroup(group) {
        return {
            group,
            layout: this.definition()
        };
    }
}
export class BindGroup {
    constructor(label, layout, entries) {
        this.layout = layout;
        this.entries = entries;
        const entryList = [];
        for (const key of Object.keys(entries)) {
            entryList.push({
                binding: layout.entries[key].binding,
                resource: entries[key].asBindingResource()
            });
        }
        this.descriptor = {
            label: `${layout.descriptor.label}@${label}`,
            layout: layout.wrapped,
            entries: entryList
        };
        this.wrapped = layout.device.device.createBindGroup(this.descriptor);
    }
    static from(descriptor) {
        return new Definition((device, label) => __awaiter(this, void 0, void 0, function* () {
            const layout = yield descriptor.layout.create(device, `${label}.layout`);
            return new BindGroup(label, layout, descriptor.entries);
        }));
    }
}
export function buffer(type) {
    return {
        buffer: { type }
    };
}
export function texture(sampleType, viewDimension = "2d", multisampled = false) {
    return {
        texture: { sampleType, viewDimension, multisampled }
    };
}
export function storageTexture(format, viewDimension = "2d", multisampled = false) {
    return {
        storageTexture: { format, viewDimension, access: "write-only" }
    };
}
export function sampler(type) {
    return {
        sampler: { type }
    };
}
export function binding(binding, visibility, resource) {
    return Object.assign({ binding, visibility: visibility.map(v => GPUShaderStage[v]).reduce((v1, v2) => v1 | v2) }, resource);
}
//# sourceMappingURL=group.js.map