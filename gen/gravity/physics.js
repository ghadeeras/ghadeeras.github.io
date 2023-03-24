var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class EngineLayout {
    constructor(universeLayout) {
        this.pipelineLayout = universeLayout.device.pipelineLayout("engineLayout", engineLayout(universeLayout));
    }
    instance(computeShader, workgroupSize) {
        return new Engine(this, computeShader, workgroupSize);
    }
}
function engineLayout(universeLayout) {
    return {
        universe: universeLayout.bindGroupLayout.asGroup(0)
    };
}
export class Engine {
    constructor(layout, computeShader, workgroupSize) {
        this.layout = layout;
        this.computeShader = computeShader;
        this.workgroupSize = workgroupSize;
        this.pipeline = layout.pipelineLayout.computeInstance(computeShader, "c_main");
    }
    move(universe) {
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
}
export function newEngine(engineLayout) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = engineLayout.pipelineLayout.device;
        const limits = device.device.limits;
        const workgroupSize = Math.max(limits.maxComputeWorkgroupSizeX, limits.maxComputeWorkgroupSizeY, limits.maxComputeWorkgroupSizeZ);
        console.warn(`Workgroup Size: ${workgroupSize}`);
        const shaderModule = yield device.loadShaderModule("gravity-compute.wgsl", code => code.replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`));
        return engineLayout.instance(shaderModule, workgroupSize);
    });
}
//# sourceMappingURL=physics.js.map