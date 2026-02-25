export class Physics {
    constructor(app, workgroupSize) {
        this.app = app;
        this.workgroupSize = workgroupSize;
    }
    apply(universe) {
        const workGroupsCount = Math.ceil(universe.bodiesCount / this.workgroupSize);
        this.app.pipelines.physics
            .withGroups({ universe: universe.next() })
            .dispatchWorkGroups(workGroupsCount)
            .enqueue();
    }
}
//# sourceMappingURL=physics.js.map