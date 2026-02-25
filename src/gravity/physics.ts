import * as meta from "./meta.js"
import { Universe } from './universe.js'

export class Physics {

    constructor(readonly app: meta.App, private workgroupSize: number) {
    }

    apply(universe: Universe) {
        const workGroupsCount = Math.ceil(universe.bodiesCount / this.workgroupSize)
        this.app.pipelines.physics
            .withGroups({ universe: universe.next() })
            .dispatchWorkGroups(workGroupsCount)
            .enqueue()
    }

}
