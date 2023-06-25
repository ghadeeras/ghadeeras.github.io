export class AppLayoutBuilder {
    constructor(label, device) {
        this.label = label;
        this.device = device;
    }
    withGroupLayouts(record) {
        return new AppLayoutBuilderWithGroupLayouts(this.label, this.device, record);
    }
}
export class AppLayoutBuilderWithGroupLayouts {
    constructor(label, device, record) {
        this.label = label;
        this.device = device;
        this.record = record;
        const groupLayouts = {};
        for (const key of Object.keys(record)) {
            this.setMember(groupLayouts, key);
        }
        this.groupLayouts = groupLayouts;
    }
    withPipelineLayouts(record) {
        return new AppLayoutBuilderWithPipelineLayouts(this.label, this.device, this.groupLayouts, record);
    }
    setMember(members, key) {
        members[key] = this.device.groupLayout(`${this.label}/groups/${key.toString()}`, this.record[key]);
    }
}
export class AppLayoutBuilderWithPipelineLayouts {
    constructor(label, device, groupLayouts, record) {
        this.label = label;
        this.device = device;
        this.groupLayouts = groupLayouts;
        this.record = record;
        const pipelineLayouts = {};
        for (const key of Object.keys(record)) {
            this.setPipelineLayout(pipelineLayouts, key);
        }
        this.pipelineLayouts = pipelineLayouts;
    }
    build() {
        return {
            pipelineLayouts: this.pipelineLayouts,
            groupLayouts: this.groupLayouts,
        };
    }
    setPipelineLayout(result, key) {
        result[key] = this.device.pipelineLayout(`${this.label}/pipelines/${key.toString()}`, this.pipelineLayout(this.record[key]));
    }
    pipelineLayout(layout) {
        const result = {};
        for (const key of Object.keys(layout)) {
            this.setPipelineLayoutEntry(result, key, layout);
        }
        return result;
    }
    setPipelineLayoutEntry(result, key, layout) {
        result[key] = this.pipelineLayoutEntry(layout[key]);
    }
    pipelineLayoutEntry(entry) {
        return {
            group: entry.group,
            layout: this.groupLayouts[entry.layout]
        };
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
    return Object.assign({ binding, visibility }, resource);
}
export function group(group, layout) {
    return { group, layout };
}
//# sourceMappingURL=layout.js.map