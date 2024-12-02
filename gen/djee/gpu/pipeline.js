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
    static async create(device, label, descriptor) {
        const entries = descriptor.bindGroupLayouts;
        const count = Object.keys(entries).map(k => entries[k].group).reduce((a, b) => a > b ? a : b) + 1;
        const bindGroupLayouts = new Array(count);
        for (const k of Object.keys(entries)) {
            const entry = entries[k];
            const groupLayout = await entry.layout.create(device, `${label}.${k}`);
            bindGroupLayouts[entry.group] = groupLayout.wrapped;
        }
        return new PipelineLayout(label, device, descriptor.bindGroupLayouts, bindGroupLayouts);
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