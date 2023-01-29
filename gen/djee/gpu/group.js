export class BindGroupLayout {
    constructor(label, device, entries) {
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
    instance(label, entries) {
        return new BindGroup(label, this, entries);
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
        this.wrapped = layout.device.device.createBindGroup({
            label,
            layout: layout.wrapped,
            entries: entryList
        });
    }
}
//# sourceMappingURL=group.js.map