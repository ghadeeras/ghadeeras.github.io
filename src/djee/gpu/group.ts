import { KeyOfType } from "../utils.js";
import { Buffer, SyncBuffer } from "./buffer.js";
import { Device } from "./device.js";
import { Definition, GPUObject } from "./meta.js";
import { PipelineLayoutEntry } from "./pipeline.js";
import { Sampler, TextureView } from "./texture.js";

export type BindGroupDescriptor<L extends BindGroupLayoutDescriptor> = {
    layout: Definition<BindGroupLayout<L["entries"]>>,
    entries: BindGroupEntries<L["entries"]>
}
export type BindGroupEntries<L extends BindGroupLayoutEntries> = {
    [k in keyof L] : BindGroupResource<InferResourceType<L[k]>>
}
export type BindGroupResource<T extends ResourceType> = 
    T extends "buffer" ? (SyncBuffer | Buffer) :
    T extends "texture" ? TextureView :
    T extends "storageTexture" ? TextureView :
    T extends "externalTexture" ? TextureView :
    T extends "sampler" ? Sampler :
    never
export type InferResourceType<E extends GPUBindGroupLayoutEntry> = 
    E extends BindGroupLayoutEntry<infer T> ? T : 
    never

export type BindGroupLayoutDescriptor = {
    entries: BindGroupLayoutEntries
}
export type BindGroupLayoutEntries = Record<string, BindGroupLayoutEntry<any>>
export type BindGroupLayoutEntry<T extends ResourceType> = 
      BindGroupResourceBinding 
    & BindGroupResourceLayout<T>
export type ResourceType = "buffer" | "texture" | "storageTexture" | "externalTexture" | "sampler"
export type BindGroupResourceBinding = Omit<GPUBindGroupLayoutEntry, ResourceType>;
export type BindGroupResourceLayout<T extends ResourceType> = Pick<Required<GPUBindGroupLayoutEntry>, T>

export class BindGroupLayout<L extends BindGroupLayoutEntries> extends GPUObject {

    readonly wrapped: GPUBindGroupLayout
    readonly descriptor: GPUBindGroupLayoutDescriptor

    constructor(label: string, readonly device: Device, readonly entries: L) {
        super()
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

    static from<D extends BindGroupLayoutDescriptor>(descriptor: D) {
        return new Definition((device, label) => new BindGroupLayout<D["entries"]>(label, device, descriptor.entries))
    }

    instance(label: string, entries: BindGroupEntries<L>): BindGroup<L> {
        return new BindGroup(label, this, entries)
    }

    asGroup(group: number): PipelineLayoutEntry<BindGroupLayout<L>> {
        return {
            group,
            layout: this.definition()
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

    static from<D extends BindGroupLayoutDescriptor>(descriptor: BindGroupDescriptor<D>) {
        return new Definition(async (device, label) => {
            const layout = await descriptor.layout.create(device, `${label}.layout`)
            return new BindGroup<D["entries"]>(label, layout, descriptor.entries)
        })
    }

}

export function buffer(type: GPUBufferBindingType): BindGroupResourceLayout<"buffer"> {
    return {
        buffer: { type }
    }
}

export function texture(sampleType: GPUTextureSampleType, viewDimension: GPUTextureViewDimension = "2d", multisampled: boolean = false): BindGroupResourceLayout<"texture"> {
    return {
        texture: { sampleType, viewDimension, multisampled }
    }
}

export function storageTexture(format: GPUTextureFormat, viewDimension: GPUTextureViewDimension = "2d", multisampled: boolean = false): BindGroupResourceLayout<"storageTexture"> {
    return {
        storageTexture: { format, viewDimension, access: "write-only" }
    }
}

export function sampler(type: GPUSamplerBindingType): BindGroupResourceLayout<"sampler"> {
    return {
        sampler: { type }
    }
}

export function binding<T extends ResourceType>(binding: number, visibility: KeyOfType<number, typeof GPUShaderStage>[], resource: BindGroupResourceLayout<T>): BindGroupLayoutEntry<T> {
    return {
        binding, visibility: visibility.map(v => GPUShaderStage[v]).reduce((v1, v2) => v1 | v2), ...resource
    }
}
