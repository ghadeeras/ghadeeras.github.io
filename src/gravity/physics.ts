import * as meta from './meta.js'
import { Universe } from './universe.js'

export class Physics {

    readonly pipeline
    
    constructor(readonly app: meta.App, private workgroupSize: number) {
        this.pipeline = app.layout.pipelineLayouts.physics.computeInstance(app.shaders.physics, "c_main")
    }

    apply(universe: Universe) {
        const workGroupsCount = Math.ceil(universe.bodiesCount / this.workgroupSize)
        this.app.device.enqueueCommand("compute", encoder => {
            encoder.computePass(pass => {
                this.pipeline.addTo(pass, {
                    universe: universe.next()
                })
                pass.dispatchWorkgroups(workGroupsCount)
            })
        })
    }

}
