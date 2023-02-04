import * as gpu from '../djee/gpu/index.js'
import { ComputePipeline, PipelineLayout } from '../djee/gpu/pipeline.js'
import { Universe, UniverseLayout } from './universe.js'

export type EnginePipelineLayout = ReturnType<typeof engineLayout>

export class EngineLayout {

    readonly pipelineLayout: PipelineLayout<EnginePipelineLayout>
    
    constructor(universeLayout: UniverseLayout) {
        this.pipelineLayout = new PipelineLayout("engineLayout", universeLayout.device, engineLayout(universeLayout))
    }

    instance(computeShader: gpu.ShaderModule, workgroupSize: number) {
        return new Engine(this, computeShader, workgroupSize)
    }

}

function engineLayout(universeLayout: UniverseLayout) {
    return {
        universe: universeLayout.bindGroupLayout.asGroup(0)
    }
}

export class Engine {

    readonly pipeline: ComputePipeline<EnginePipelineLayout>
    
    constructor(readonly layout: EngineLayout, readonly computeShader: gpu.ShaderModule, private workgroupSize: number) {
        this.pipeline = layout.pipelineLayout.computeInstance(computeShader, "c_main")
    }

    move(universe: Universe) {
        const workGroupsCount = Math.ceil(universe.bodiesCount / this.workgroupSize)
        this.computeShader.device.enqueueCommand("compute", encoder => {
            encoder.computePass(pass => {
                this.pipeline.addTo(pass, {
                    universe: universe.next()
                })
                pass.dispatchWorkgroups(workGroupsCount)
            })
        })
    }

}

export async function newEngine(engineLayout: EngineLayout) {
    const device = engineLayout.pipelineLayout.device
    const limits = device.device.limits
    const workgroupSize = Math.max(
        limits.maxComputeWorkgroupSizeX,
        limits.maxComputeWorkgroupSizeY,
        limits.maxComputeWorkgroupSizeZ
    )
    console.warn(`Workgroup Size: ${workgroupSize}`)
    const shaderModule = await device.loadShaderModule("gravity-compute.wgsl", code => code.replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`))
    return engineLayout.instance(shaderModule, workgroupSize)
}
