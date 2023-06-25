import { Buffer, SyncBuffer } from "./buffer.js";
import { Device } from "./device.js";
import { PipelineLayoutEntry } from "./pipeline.js";
import { Sampler, TextureView } from "./texture.js";

export type ResourceType = "buffer" | "texture" | "storageTexture" | "externalTexture" | "sampler"
export type SubBindGroupLayoutEntry<T extends ResourceType> = Pick<Required<GPUBindGroupLayoutEntry>, T>
export type BindGroupLayoutEntry<T extends ResourceType> = Omit<GPUBindGroupLayoutEntry, ResourceType> & SubBindGroupLayoutEntry<T>
export type ResourceForType<T extends ResourceType> = 
    T extends "buffer" ? (SyncBuffer | Buffer) :
    T extends "texture" ? TextureView :
    T extends "storageTexture" ? TextureView :
    T extends "externalTexture" ? TextureView :
    T extends "sampler" ? Sampler :
    never
export type ResourceForLayoutEntry<E extends GPUBindGroupLayoutEntry> = 
    E extends BindGroupLayoutEntry<infer T> ? ResourceForType<T> : 
    never

export type BindGroupLayoutEntries = Record<string, GPUBindGroupLayoutEntry>
export type BindGroupEntries<L extends BindGroupLayoutEntries> = {
    [k in keyof L] : ResourceForLayoutEntry<L[k]>
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
            label: `${layout.descriptor.label}@${label}`,
            layout: layout.wrapped,
            entries: entryList
        }
        this.wrapped = layout.device.device.createBindGroup(this.descriptor)
    }

}