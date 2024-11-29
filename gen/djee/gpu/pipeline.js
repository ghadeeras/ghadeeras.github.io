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
export class PipelineLayout extends GPUObject {
    constructor(label, device, entries, bindGroupLayouts) {
        super();
        this.device = device;
        this.entries = entries;
        this.descriptor = { label, bindGroupLayouts };
        this.wrapped = device.device.createPipelineLayout(this.descriptor);
    }
    static from(descriptor) {
        return new Definition((device, label) => PipelineLayout.create(device, label, descriptor));
    }
    static create(device, label, descriptor) {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = descriptor.bindGroupLayouts;
            const count = Object.keys(entries).map(k => entries[k].group).reduce((a, b) => a > b ? a : b) + 1;
            const bindGroupLayouts = new Array(count);
            for (const k of Object.keys(entries)) {
                const entry = entries[k];
                const groupLayout = yield entry.layout.create(device, `${label}.${k}`);
                bindGroupLayouts[entry.group] = groupLayout.wrapped;
            }
            return new PipelineLayout(label, device, descriptor.bindGroupLayouts, bindGroupLayouts);
        });
    }
    computeInstance(module, entryPoint) {
        return new ComputePipeline(this, module, entryPoint);
    }
}
export class ComputePipeline {
    constructor(layout, module, entryPoint) {
        this.layout = layout;
        this.module = module;
        this.entryPoint = entryPoint;
        this.descriptor = {
            label: `${layout.descriptor.label}/${module.descriptor.label}/${entryPoint}`,
            layout: layout.wrapped,
            compute: {
                entryPoint,
                module: module.shaderModule,
            }
        };
        this.wrapped = layout.device.device.createComputePipeline(this.descriptor);
    }
    addTo(pass, groups = {}) {
        pass.setPipeline(this.wrapped);
        this.addGroupsTo(pass, groups);
    }
    addGroupsTo(pass, groups) {
        for (const k of Object.keys(groups)) {
            const group = groups[k];
            if (group) {
                pass.setBindGroup(this.layout.entries[k].group, group.wrapped);
            }
        }
    }
}
export function group(group, layout) {
    return { group, layout };
}
//# sourceMappingURL=pipeline.js.map