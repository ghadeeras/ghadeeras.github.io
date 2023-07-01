import * as gpu from '../djee/gpu/index.js'
import * as meta from './meta.js'
import { Universe } from './universe.js'

export class Physics {

    readonly pipeline: meta.PhysicsPipeline
    
    private constructor(readonly layout: meta.AppLayout, readonly computeShader: gpu.ShaderModule, private workgroupSize: number) {
        this.pipeline = layout.pipelineLayouts.physics.computeInstance(computeShader, "c_main")
    }

    apply(universe: Universe) {
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

    static async create(layout: meta.AppLayout, workgroupSize: number) {
        const device = layout.device
        console.warn(`Workgroup Size: ${workgroupSize}`)
        const shaderModule = await device.loadShaderModule("gravity-compute.wgsl", code => code.replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`))
        return new Physics(layout, shaderModule, workgroupSize)
    }
    
}
