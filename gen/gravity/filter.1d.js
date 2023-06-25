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
    constructor(shader, weights, workgroupSize) {
        this.shader = shader;
        this.weights = weights;
        this.workgroupSize = workgroupSize;
        const device = shader.device;
        this.filterGroupLayout = device.groupLayout("filterGroupLayout", Filter1D.filterGroupLayoutEntries);
        this.ioGroupLayout = device.groupLayout("ioGroupLayout", Filter1D.ioGroupLayoutEntries);
        const pipelineLayout = device.pipelineLayout("filterPipeline", Filter1D.newPipelineLayoutEntries(this.filterGroupLayout, this.ioGroupLayout));
        this.pipeline = pipelineLayout.computeInstance(shader, "c_main");
        this.horizontal = device.buffer(`ioGroup0.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([0]));
        this.vertical = device.buffer(`ioGroup1.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([1]));
        this.filterGroup = this.filterGroupLayout.instance(`filterWeightsGroup`, {
            filter: device.buffer(`filterWeightsBuffer`, GPUBufferUsage.STORAGE, gpu.f32.view(this.weights))
        });
    }
    forTexture(texture) {
        const device = this.shader.device;
        const temp = device.texture(Object.assign(Object.assign({}, texture.descriptor), { label: `${texture.descriptor.label}_temp` }));
        const ioGroup1 = this.ioGroupLayout.instance(`${texture.descriptor.label}_ioGroup1`, {
            direction: this.horizontal,
            source: texture.createView(),
            target: temp.createView()
        });
        const ioGroup2 = this.ioGroupLayout.instance(`${texture.descriptor.label}_ioGroup2`, {
            direction: this.vertical,
            source: temp.createView(),
            target: texture.createView()
        });
        const wgCountX = Math.ceil(texture.size.width / this.workgroupSize[0]);
        const wgCountY = Math.ceil(gear.required(texture.size.height) / this.workgroupSize[1]);
        console.log(`Filter Workgroups Count: [${wgCountX}, ${wgCountY}]`);
        return new Filtering1D((encoder, count = 1) => this.pass(ioGroup1, ioGroup2, wgCountX, wgCountY, encoder, count), () => temp.destroy());
    }
    pass(ioGroup1, ioGroup2, wgCountX, wgCountY, encoder, count) {
        encoder.computePass(pass => {
            this.pipeline.addTo(pass, { filter: this.filterGroup });
            for (let i = 0; i < count; i++) {
                this.pipeline.addGroupsTo(pass, { io: ioGroup1 });
                pass.dispatchWorkgroups(wgCountX, wgCountY);
                this.pipeline.addGroupsTo(pass, { io: ioGroup2 });
                pass.dispatchWorkgroups(wgCountX, wgCountY);
            }
        });
    }
    static newPipelineLayoutEntries(filterGroupLayout, ioGroupLayout) {
        return {
            "filter": filterGroupLayout.asGroup(0),
            "io": ioGroupLayout.asGroup(1)
        };
    }
    static create(device, weights) {
        return __awaiter(this, void 0, void 0, function* () {
            const [wgMaxX, wgMaxY] = [device.device.limits.maxComputeWorkgroupSizeX, device.device.limits.maxComputeWorkgroupSizeY];
            const wgS = Math.pow(2, Math.floor(Math.log2(wgMaxX * wgMaxY) / 4));
            const wgX = Math.min(wgS, wgMaxX);
            const wgY = Math.pow(2, Math.floor(Math.log2(wgMaxY / wgX)));
            console.log(`Filter Workgroup Size: [${wgX}, ${wgY}]`);
            const shader = yield device.loadShaderModule("filter-1d.wgsl", s => s
                .replace(/\[\[workgroup_size_x\]\]/g, wgX.toString())
                .replace(/\[\[workgroup_size_y\]\]/g, wgY.toString()));
            return new Filter1D(shader, weights, [wgX, wgY]);
        });
    }
}
Filter1D.filterGroupLayoutEntries = {
    filter: gpu.binding(0, GPUShaderStage.COMPUTE, gpu.buffer("read-only-storage"))
};
Filter1D.ioGroupLayoutEntries = {
    direction: gpu.binding(0, GPUShaderStage.COMPUTE, gpu.buffer("uniform")),
    source: gpu.binding(1, GPUShaderStage.COMPUTE, gpu.texture("float")),
    target: gpu.binding(2, GPUShaderStage.COMPUTE, gpu.storageTexture("rgba16float")),
};
export { Filter1D };
export class Filtering1D {
    constructor(apply, destroy) {
        this.apply = apply;
        this.destroy = destroy;
    }
}
export function gaussianWeights(relativeMinValue, count) {
    const result = [1];
    const c = Math.log(relativeMinValue) / (count * count);
    let sum = 1;
    for (let i = 1; i < count; i++) {
        const w = Math.exp(c * i * i);
        result.push(w);
        sum += 2 * w;
    }
    return result.map(w => w / sum);
}
//# sourceMappingURL=filter.1d.js.map