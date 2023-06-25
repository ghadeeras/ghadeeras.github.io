import { Device } from "./device.js";
import { BindGroupLayout, BindGroupLayoutEntries, BindGroupLayoutEntry, ResourceType, SubBindGroupLayoutEntry } from "./group.js";
import { PipelineLayout } from "./pipeline.js";

export type AppLayout<G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutsRecord<G>> = {
    pipelineLayouts: PipelineLayouts<G, P>
    groupLayouts: BindGroupLayouts<G>
}
export type PipelineLayouts<G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutsRecord<G>> = {
    [k in keyof P]: PipelineLayout<DerefPipelineLayoutEntries<G, P[k]>>
}
export type DerefPipelineLayoutEntries<G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutEntries<G>> = {
    [k in keyof P]: DerefPipelineLayoutEntry<G, P[k]>
}
export type DerefPipelineLayoutEntry<G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutEntry<G>> = {
    group: P["group"],
    layout: BindGroupLayouts<G>[P["layout"]]
}
export type RefPipelineLayoutsRecord<G extends BindGroupLayoutsRecord> = Record<string, RefPipelineLayoutEntries<G>>
export type RefPipelineLayoutEntries<G extends BindGroupLayoutsRecord> = Record<string, RefPipelineLayoutEntry<G>>
export type RefPipelineLayoutEntry<G extends BindGroupLayoutsRecord> = {
    group: number, 
    layout: keyof G
}
export type BindGroupLayouts<G extends BindGroupLayoutsRecord> = {
    [k in keyof G]: BindGroupLayout<G[k]>
}
export type BindGroupLayoutsRecord = Record<string, BindGroupLayoutEntries>

export class AppLayoutBuilder {

    constructor(private label: string, private device: Device) {}

    withGroupLayouts<G extends BindGroupLayoutsRecord>(record: G): AppLayoutBuilderWithGroupLayouts<G> {
        return new AppLayoutBuilderWithGroupLayouts(this.label, this.device, record)
    }

}

export class AppLayoutBuilderWithGroupLayouts<G extends BindGroupLayoutsRecord> {

    private groupLayouts: BindGroupLayouts<G>

    constructor(private label: string, private device: Device, private record: G) {
        const groupLayouts: Partial<BindGroupLayouts<G>> = {}
        for (const key of Object.keys(record)) {
            this.setMember(groupLayouts, key)
        }
        this.groupLayouts = groupLayouts as BindGroupLayouts<G>
    }

    withPipelineLayouts<P extends RefPipelineLayoutsRecord<G>>(record: P): AppLayoutBuilderWithPipelineLayouts<G, P> {
        return new AppLayoutBuilderWithPipelineLayouts(this.label, this.device, this.groupLayouts, record)
    }

    private setMember<K extends keyof G>(members: Partial<BindGroupLayouts<G>>, key: K) {
        members[key] = this.device.groupLayout(`${this.label}/groups/${key.toString()}`, this.record[key])
    }

}

export class AppLayoutBuilderWithPipelineLayouts<G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutsRecord<G>> {

    private pipelineLayouts: PipelineLayouts<G, P>

    constructor(private label: string, private device: Device, private groupLayouts: BindGroupLayouts<G>, private record: P) {
        const pipelineLayouts: Partial<PipelineLayouts<G, P>> = {}
        for (const key of Object.keys(record)) {
            this.setPipelineLayout(pipelineLayouts, key);
        }
        this.pipelineLayouts = pipelineLayouts as PipelineLayouts<G, P>
    }

    build(): AppLayout<G, P> {
        return {
            pipelineLayouts: this.pipelineLayouts,
            groupLayouts: this.groupLayouts,
        }
    }

    private setPipelineLayout<K extends keyof P>(result: Partial<PipelineLayouts<G, P>>, key: K) {
        result[key] = this.device.pipelineLayout(`${this.label}/pipelines/${key.toString()}`,  this.pipelineLayout(this.record[key]));
    }

    private pipelineLayout<L extends RefPipelineLayoutEntries<G>>(layout: L): DerefPipelineLayoutEntries<G, L> {
        const result: Partial<DerefPipelineLayoutEntries<G, L>> = {}
        for (const key of Object.keys(layout)) {
            this.setPipelineLayoutEntry(result, key, layout);
        }
        return result as DerefPipelineLayoutEntries<G, L>
    }

    private setPipelineLayoutEntry<L extends RefPipelineLayoutEntries<G>, K extends keyof L>(result: Partial<DerefPipelineLayoutEntries<G, L>>, key: K, layout: L) {
        result[key] = this.pipelineLayoutEntry(layout[key]);
    }

    private pipelineLayoutEntry<E extends RefPipelineLayoutEntry<G>>(entry: E): DerefPipelineLayoutEntry<G, E> {
        return {
            group: entry.group,
            layout: this.groupLayouts[entry.layout]
        }
    }

}

export function buffer(type: GPUBufferBindingType): SubBindGroupLayoutEntry<"buffer"> {
    return {
        buffer: { type }
    }
}

export function texture(sampleType: GPUTextureSampleType, viewDimension: GPUTextureViewDimension = "2d", multisampled: boolean = false): SubBindGroupLayoutEntry<"texture"> {
    return {
        texture: { sampleType, viewDimension, multisampled }
    }
}

export function storageTexture(format: GPUTextureFormat, viewDimension: GPUTextureViewDimension = "2d", multisampled: boolean = false): SubBindGroupLayoutEntry<"storageTexture"> {
    return {
        storageTexture: { format, viewDimension, access: "write-only" }
    }
}

export function sampler(type: GPUSamplerBindingType): SubBindGroupLayoutEntry<"sampler"> {
    return {
        sampler: { type }
    }
}

export function binding<T extends ResourceType>(binding: number, visibility: number, resource: SubBindGroupLayoutEntry<T>): BindGroupLayoutEntry<T> {
    return {
        binding, visibility, ...resource
    }
}

export function group<G extends BindGroupLayoutsRecord>(group: number, layout: keyof G): RefPipelineLayoutEntry<G> {
    return { group, layout }
}
