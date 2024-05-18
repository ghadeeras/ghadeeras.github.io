import { KeyOfType } from "../utils.js";
import { App, AppBuilderWithPipelineLayouts } from "./app.js";
import { Device } from "./device.js";
import { BindGroupLayout, BindGroupLayoutEntries, BindGroupLayoutEntry, ResourceType, SubBindGroupLayoutEntry } from "./group.js";
import { PipelineLayout } from "./pipeline.js";

export type AppLayoutFrom<B> = 
      B extends AppLayoutBuilderWithPipelineLayouts<any, any> ? ReturnType<B["build"]> 
    : B extends AppBuilderWithPipelineLayouts<any, any, any> ? AppFrom<B>["layout"]
    : never

export type AppFrom<B extends AppBuilderWithPipelineLayouts<any, any, any>> = 
    ReturnType<B["build"]> extends Promise<infer A extends App<any, any, any>>
        ? A
        : never
export type BindGroupFrom<A extends AppLayout<any, any>, L extends keyof A["groupLayouts"]> = ReturnType<A["groupLayouts"][L]["instance"]>
export type ComputePipelineFrom<A extends AppLayout<any, any>, L extends keyof A["pipelineLayouts"]> = ReturnType<A["pipelineLayouts"][L]["computeInstance"]>

export type AppLayout<G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutsRecord<G>> = {
    device: Device
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

    constructor(private label: string) {}

    withGroupLayouts<G extends BindGroupLayoutsRecord>(record: G): AppLayoutBuilderWithGroupLayouts<G> {
        return new AppLayoutBuilderWithGroupLayouts(this.label, record)
    }

}

export class AppLayoutBuilderWithGroupLayouts<G extends BindGroupLayoutsRecord> {

    constructor(readonly label: string, private record: G) {
    }

    withPipelineLayouts<P extends RefPipelineLayoutsRecord<G>>(record: P): AppLayoutBuilderWithPipelineLayouts<G, P> {
        return new AppLayoutBuilderWithPipelineLayouts(this, record)
    }

    build(device: Device): BindGroupLayouts<G> {
        const groupLayouts: Partial<BindGroupLayouts<G>> = {}
        for (const key of Object.keys(this.record)) {
            this.setMember(device, groupLayouts, key)
        }
        return groupLayouts as BindGroupLayouts<G>
    }

    private setMember<K extends keyof G>(device: Device, members: Partial<BindGroupLayouts<G>>, key: K) {
        members[key] = device.groupLayout(`${this.label}/groups/${key.toString()}`, this.record[key])
    }

}

export class AppLayoutBuilderWithPipelineLayouts<G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutsRecord<G>> {

    constructor(private parent: AppLayoutBuilderWithGroupLayouts<G>, private record: P) {
    }

    build(device: Device): AppLayout<G, P> {
        const groupLayouts = this.parent.build(device);
        return {
            device,
            groupLayouts,
            pipelineLayouts: this.pipelineLayouts(device, groupLayouts),
        }
    }

    private pipelineLayouts(device: Device, groupLayouts: BindGroupLayouts<G>): PipelineLayouts<G, P> {
        const pipelineLayouts: Partial<PipelineLayouts<G, P>> = {}
        for (const key of Object.keys(this.record)) {
            this.setPipelineLayout(device, groupLayouts, pipelineLayouts, key);
        }
        return pipelineLayouts as PipelineLayouts<G, P>
    }

    private setPipelineLayout<K extends keyof P>(device: Device, groupLayouts: BindGroupLayouts<G>, result: Partial<PipelineLayouts<G, P>>, key: K) {
        result[key] = device.pipelineLayout(`${this.parent.label}/pipelines/${key.toString()}`,  this.pipelineLayout(groupLayouts, this.record[key]));
    }

    private pipelineLayout<L extends RefPipelineLayoutEntries<G>>(groupLayouts: BindGroupLayouts<G>, layout: L): DerefPipelineLayoutEntries<G, L> {
        const result: Partial<DerefPipelineLayoutEntries<G, L>> = {}
        for (const key of Object.keys(layout)) {
            this.setPipelineLayoutEntry(groupLayouts, result, key, layout);
        }
        return result as DerefPipelineLayoutEntries<G, L>
    }

    private setPipelineLayoutEntry<L extends RefPipelineLayoutEntries<G>, K extends keyof L>(groupLayouts: BindGroupLayouts<G>, result: Partial<DerefPipelineLayoutEntries<G, L>>, key: K, layout: L) {
        result[key] = this.pipelineLayoutEntry(groupLayouts, layout[key]);
    }

    private pipelineLayoutEntry<E extends RefPipelineLayoutEntry<G>>(groupLayouts: BindGroupLayouts<G>, entry: E): DerefPipelineLayoutEntry<G, E> {
        return {
            group: entry.group,
            layout: groupLayouts[entry.layout]
        }
    }

}

export function appLayoutBuilder(label: string) {
    return new AppLayoutBuilder(label)
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

export function binding<T extends ResourceType>(binding: number, visibility: KeyOfType<number, GPUShaderStage>[], resource: SubBindGroupLayoutEntry<T>): BindGroupLayoutEntry<T> {
    return {
        binding, visibility: visibility.map(v => GPUShaderStage[v]).reduce((v1, v2) => v1 | v2), ...resource
    }
}

export function group<G extends BindGroupLayoutsRecord>(group: number, layout: keyof G): RefPipelineLayoutEntry<G> {
    return { group, layout }
}
