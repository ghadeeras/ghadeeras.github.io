export class AppLayoutBuilder {
    constructor(label) {
        this.label = label;
    }
    withGroupLayouts(record) {
        return new AppLayoutBuilderWithGroupLayouts(this.label, record);
    }
}
export class AppLayoutBuilderWithGroupLayouts {
    constructor(label, record) {
        this.label = label;
        this.record = record;
    }
    withPipelineLayouts(record) {
        return new AppLayoutBuilderWithPipelineLayouts(this, record);
    }
    build(device) {
        const groupLayouts = {};
        for (const key of Object.keys(this.record)) {
            this.setMember(device, groupLayouts, key);
        }
        return groupLayouts;
    }
    setMember(device, members, key) {
        members[key] = device.groupLayout(`${this.label}/groups/${key.toString()}`, this.record[key]);
    }
}
export class AppLayoutBuilderWithPipelineLayouts {
    constructor(parent, record) {
        this.parent = parent;
        this.record = record;
    }
    build(device) {
        const groupLayouts = this.parent.build(device);
        return {
            device,
            groupLayouts,
            pipelineLayouts: this.pipelineLayouts(device, groupLayouts),
        };
    }
    pipelineLayouts(device, groupLayouts) {
        const pipelineLayouts = {};
        for (const key of Object.keys(this.record)) {
            this.setPipelineLayout(device, groupLayouts, pipelineLayouts, key);
        }
        return pipelineLayouts;
    }
    setPipelineLayout(device, groupLayouts, result, key) {
        result[key] = device.pipelineLayout(`${this.parent.label}/pipelines/${key.toString()}`, this.pipelineLayout(groupLayouts, this.record[key]));
    }
    pipelineLayout(groupLayouts, layout) {
        const result = {};
        for (const key of Object.keys(layout)) {
            this.setPipelineLayoutEntry(groupLayouts, result, key, layout);
        }
        return result;
    }
    setPipelineLayoutEntry(groupLayouts, result, key, layout) {
        result[key] = this.pipelineLayoutEntry(groupLayouts, layout[key]);
    }
    pipelineLayoutEntry(groupLayouts, entry) {
        return {
            group: entry.group,
            layout: groupLayouts[entry.layout]
        };
    }
}
export function appLayoutBuilder(label) {
    return new AppLayoutBuilder(label);
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
export function group(group, layout) {
    return { group, layout };
}
//# sourceMappingURL=layout.js.map