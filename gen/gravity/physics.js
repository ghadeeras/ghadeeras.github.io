var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Engine {
    constructor(universeLayout, computeShader, workgroupSize) {
        this.universeLayout = universeLayout;
        this.workgroupSize = workgroupSize;
        this.pipeline = computeShader.computePipeline("c_main", universeLayout.device.device.createPipelineLayout({
            bindGroupLayouts: [universeLayout.bindGroupLayout.wrapped]
        }));
    }
    move(universe) {
        const workGroupsCount = Math.ceil(universe.bodiesCount / this.workgroupSize);
        this.universeLayout.device.enqueueCommand("compute", encoder => {
            encoder.computePass(pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, universe.next().wrapped);
                pass.dispatchWorkgroups(workGroupsCount);
            });
        });
    }
}
export function newEngine(universeLayout) {
    return __awaiter(this, void 0, void 0, function* () {
        const limits = universeLayout.device.device.limits;
        const workgroupSize = Math.max(limits.maxComputeWorkgroupSizeX, limits.maxComputeWorkgroupSizeY, limits.maxComputeWorkgroupSizeZ);
        console.warn(`Workgroup Size: ${workgroupSize}`);
        const shaderModule = yield universeLayout.device.loadShaderModule("gravity-compute.wgsl", code => code.replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`));
        return new Engine(universeLayout, shaderModule, workgroupSize);
    });
}
//# sourceMappingURL=physics.js.map