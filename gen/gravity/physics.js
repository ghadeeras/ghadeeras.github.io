var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Physics {
    constructor(layout, computeShader, workgroupSize) {
        this.layout = layout;
        this.computeShader = computeShader;
        this.workgroupSize = workgroupSize;
        this.pipeline = layout.pipelineLayouts.physics.computeInstance(computeShader, "c_main");
    }
    apply(universe) {
        const workGroupsCount = Math.ceil(universe.bodiesCount / this.workgroupSize);
        this.computeShader.device.enqueueCommand("compute", encoder => {
            encoder.computePass(pass => {
                this.pipeline.addTo(pass, {
                    universe: universe.next()
                });
                pass.dispatchWorkgroups(workGroupsCount);
            });
        });
    }
    static create(layout, workgroupSize) {
        return __awaiter(this, void 0, void 0, function* () {
            const device = layout.device;
            console.warn(`Workgroup Size: ${workgroupSize}`);
            const shaderModule = yield device.loadShaderModule("gravity-compute.wgsl", code => code.replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`));
            return new Physics(layout, shaderModule, workgroupSize);
        });
    }
}
//# sourceMappingURL=physics.js.map