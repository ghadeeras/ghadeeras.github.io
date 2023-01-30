import { Buffer, SyncBuffer } from "./buffer";
import { Device } from "./device";
import { PipelineLayoutEntry } from "./pipeline";
import { Sampler, TextureView } from "./texture";

export type BindGroupLayoutEntries = Record<string, GPUBindGroupLayoutEntry>
export type BindGroupEntries<L extends BindGroupLayoutEntries> = {
    [k in keyof L]
        : L[k]["buffer" ] extends {} ? (Buffer | SyncBuffer) 
        : L[k]["texture"] extends {} ? TextureView 
        : L[k]["sampler"] extends {} ? Sampler 
        : never
}

export class BindGroupLayout<L extends BindGroupLayoutEntries> {

    readonly wrapped: GPUBindGroupLayout
    readonly descriptor: GPUBindGroupLayoutDescriptor

    constructor(label: string, readonly device: Device, readonly entries: L) {
        const entryList: GPUBindGroupLayoutEntry[] = [];
        for (const key of Object.keys(entries)) {
            entryList.push(entries[key])
        }
        this.descriptor = {
            label,
            entries: entryList
        }
        this.wrapped = device.device.createBindGroupLayout(this.descriptor)
    }

    instance(label: string, entries: BindGroupEntries<L>): BindGroup<L> {
        return new BindGroup(label, this, entries)
    }

    asGroup(group: number): PipelineLayoutEntry<BindGroupLayout<L>> {
        return {
            group,
            layout: this
        }
    }

}

export class BindGroup<L extends BindGroupLayoutEntries> {

    readonly wrapped: GPUBindGroup
    readonly descriptor: GPUBindGroupDescriptor

    constructor(label: string, readonly layout: BindGroupLayout<L>, readonly entries: BindGroupEntries<L>) {
        const entryList: GPUBindGroupEntry[] = [];
        for (const key of Object.keys(entries)) {
            entryList.push({
                binding: layout.entries[key].binding,
                resource: entries[key].asBindingResource()
            })
        }
        this.descriptor = {
            label,
            layout: layout.wrapped,
            entries: entryList
        }
        this.wrapped = layout.device.device.createBindGroup(this.descriptor)
    }

}