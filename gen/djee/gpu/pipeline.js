export class PipelineLayout {
    constructor(label, device, entries) {
        this.device = device;
        this.entries = entries;
        const count = Object.keys(entries).map(k => entries[k].group).reduce((a, b) => a > b ? a : b) + 1;
        const bindGroupLayouts = new Array(count);
        for (const k of Object.keys(entries)) {
            const entry = entries[k];
            bindGroupLayouts[entry.group] = entry.layout.wrapped;
        }
        this.descriptor = { label, bindGroupLayouts };
        this.wrapped = device.device.createPipelineLayout(this.descriptor);
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
//# sourceMappingURL=pipeline.js.map