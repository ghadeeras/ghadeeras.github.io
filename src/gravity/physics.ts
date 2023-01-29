import * as gpu from '../djee/gpu/index.js'
import { Universe, UniverseLayout } from './universe.js'

export class Engine {

    readonly pipeline: GPUComputePipeline
    
    constructor(private universeLayout: UniverseLayout, computeShader: gpu.ShaderModule, private workgroupSize: number) {
        this.pipeline = computeShader.computePipeline("c_main", universeLayout.device.device.createPipelineLayout({
            bindGroupLayouts: [universeLayout.bindGroupLayout.wrapped]
        }))
    }

    move(universe: Universe) {
        const workGroupsCount = Math.ceil(universe.bodiesCount / this.workgroupSize)
        this.universeLayout.device.enqueueCommand("compute", encoder => {
            encoder.computePass(pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, universe.next().wrapped)
                pass.dispatchWorkgroups(workGroupsCount)
            })
        })
    }

}

export async function newEngine(universeLayout: UniverseLayout) {
    const limits = universeLayout.device.device.limits
    const workgroupSize = Math.max(
        limits.maxComputeWorkgroupSizeX,
        limits.maxComputeWorkgroupSizeY,
        limits.maxComputeWorkgroupSizeZ
    )
    console.warn(`Workgroup Size: ${workgroupSize}`)
    const shaderModule = await universeLayout.device.loadShaderModule("gravity-compute.wgsl", code => code.replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`))
    return new Engine(universeLayout, shaderModule, workgroupSize)
}
