export class Physics {
    constructor(app, workgroupSize) {
        this.app = app;
        this.workgroupSize = workgroupSize;
        this.pipeline = app.layout.pipelineLayouts.physics.computeInstance(app.shaders.physics, "c_main");
    }
    apply(universe) {
        const workGroupsCount = Math.ceil(universe.bodiesCount / this.workgroupSize);
        this.app.device.enqueueCommand("compute", encoder => {
            encoder.computePass(pass => {
                this.pipeline.addTo(pass, {
                    universe: universe.next()
                });
                pass.dispatchWorkgroups(workGroupsCount);
            });
        });
    }
}
//# sourceMappingURL=physics.js.map