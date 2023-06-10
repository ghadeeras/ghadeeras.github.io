import { Device } from "./device.js"
import { BindGroup, BindGroupLayout } from "./group.js"
import { ShaderModule } from "./shader.js"

export type PipelineLayoutEntry<L extends BindGroupLayout<any>> = {
    group: number,
    layout: L
}
export type PipelineLayoutEntries = Record<string, PipelineLayoutEntry<any>>
export type PipelineEntries<L extends PipelineLayoutEntries> = {
    [k in keyof L]: L[k] extends PipelineLayoutEntry<BindGroupLayout<infer T>> ? BindGroup<T> : never
}
export class PipelineLayout<L extends PipelineLayoutEntries> {

    readonly wrapped: GPUPipelineLayout
    readonly descriptor: GPUPipelineLayoutDescriptor
    
    constructor(label: string, readonly device: Device, readonly entries: L) {
        const count = Object.keys(entries).map(k => entries[k].group).reduce((a, b) =>  a > b ? a : b) + 1
        const bindGroupLayouts = new Array<GPUBindGroupLayout>(count)
        for (const k of Object.keys(entries)) {
            const entry =  entries[k]
            bindGroupLayouts[entry.group] = entry.layout.wrapped
        } 
        this.descriptor = { label, bindGroupLayouts }
        this.wrapped = device.device.createPipelineLayout(this.descriptor)
    }

    computeInstance(module: ShaderModule, entryPoint: string): ComputePipeline<L> {
        return new ComputePipeline(this, module, entryPoint)
    }

}

export class ComputePipeline<L extends PipelineLayoutEntries> {

    readonly wrapped: GPUComputePipeline
    readonly descriptor: GPUComputePipelineDescriptor

    constructor(readonly layout: PipelineLayout<L>, readonly module: ShaderModule, readonly entryPoint: string) {
        this.descriptor = {
            label: `${layout.descriptor.label}/${module.descriptor.label}/${entryPoint}`,
            layout: layout.wrapped, 
            compute: {
                entryPoint,
                module: module.shaderModule,
            }
        }
        this.wrapped = layout.device.device.createComputePipeline(this.descriptor)
    }

    addTo(pass: GPUComputePassEncoder, groups: Partial<PipelineEntries<L>> = {}) {
        pass.setPipeline(this.wrapped)
        this.addGroupsTo(pass, groups)
    }

    addGroupsTo(pass: GPUComputePassEncoder, groups: Partial<PipelineEntries<L>>) {
        for (const k of Object.keys(groups)) {
            const group = groups[k]
            if (group) {
                pass.setBindGroup(this.layout.entries[k].group, group.wrapped)
            }
        }
    }

}