var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from '../djee/gpu/index.js';
import { gear } from '../libs.js';
class Filter1D {
    constructor(workgroupSize, shader, texture, weights) {
        this.workgroupSize = workgroupSize;
        this.texture = texture;
        const device = shader.device;
        const filterGroupLayout = device.groupLayout("filterGroupLayout", Filter1D.filterGroupLayoutEntries);
        const ioGroupLayout = device.groupLayout("ioGroupLayout", Filter1D.ioGroupLayoutEntries);
        const pipelineLayout = device.pipelineLayout("filterPipeline", Filter1D.newPipelineLayout(filterGroupLayout, ioGroupLayout));
        const temp = device.texture(Object.assign(Object.assign({}, texture.descriptor), { label: "temp" }));
        this.filterGroup = filterGroupLayout.instance("filterWeightsGroup", {
            filter: device.buffer("filterWeightsBuffer", GPUBufferUsage.STORAGE, gpu.f32.view(weights))
        });
        this.ioGroup1 = ioGroupLayout.instance("ioGroup1", {
            direction: device.buffer("ioGroup1.direction", GPUBufferUsage.UNIFORM, gpu.u32.view([0])),
            source: texture.createView(),
            target: temp.createView()
        });
        this.ioGroup2 = ioGroupLayout.instance("ioGroup1", {
            direction: device.buffer("ioGroup2.direction", GPUBufferUsage.UNIFORM, gpu.u32.view([1])),
            source: temp.createView(),
            target: texture.createView()
        });
        this.pipeline = pipelineLayout.computeInstance(shader, "c_main");
    }
    apply() {
        const device = this.pipeline.module.device;
        device.enqueueCommand("filtering", encoder => {
            encoder.computePass(pass => {
                this.pipeline.addTo(pass, {
                    filter: this.filterGroup,
                    io: this.ioGroup1
                });
                pass.dispatchWorkgroups(Math.ceil(this.texture.size.width / this.workgroupSize), Math.ceil(gear.required(this.texture.size.height) / this.workgroupSize));
                this.pipeline.addGroupsTo(pass, {
                    io: this.ioGroup2
                });
                pass.dispatchWorkgroups(Math.ceil(this.texture.size.width / this.workgroupSize), Math.ceil(gear.required(this.texture.size.height) / this.workgroupSize));
            });
        });
    }
    static newPipelineLayout(filterGroupLayout, ioGroupLayout) {
        return {
            "filter": filterGroupLayout.asGroup(0),
            "io": ioGroupLayout.asGroup(1)
        };
    }
    static create(workgroupSize, device, texture, weights) {
        return __awaiter(this, void 0, void 0, function* () {
            const ws = 1 >> Math.floor(Math.log2(Math.sqrt(workgroupSize)));
            const shader = yield device.loadShaderModule("filter-1d", s => s.replace(/\[\[workgroup_size\]\]/g, ws.toString()));
            return new Filter1D(ws, shader, texture, weights);
        });
    }
}
Filter1D.filterGroupLayoutEntries = {
    filter: {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "storage"
        }
    }
};
Filter1D.ioGroupLayoutEntries = {
    direction: {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "uniform"
        }
    },
    source: {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
            sampleType: "float"
        }
    },
    target: {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
            format: "rgba16float"
        }
    }
};
export { Filter1D };
//# sourceMappingURL=filter.1d.js.map