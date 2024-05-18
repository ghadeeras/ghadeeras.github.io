import * as gpu from '../djee/gpu/index.js';
import { gear } from '../libs.js';
export class Filter1D {
    constructor(app, weights, workgroupSize) {
        this.app = app;
        this.weights = weights;
        this.workgroupSize = workgroupSize;
        this.pipeline = app.layout.pipelineLayouts.filtering.computeInstance(app.shaders.bloom, "c_main");
        this.horizontal = app.device.buffer(`ioGroup0.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([0]));
        this.vertical = app.device.buffer(`ioGroup1.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([1]));
        this.filterGroup = app.layout.groupLayouts.filter1D.instance(`filterWeightsGroup`, {
            weights: app.device.buffer(`filterWeightsBuffer`, GPUBufferUsage.STORAGE, gpu.f32.view(this.weights))
        });
    }
    forTexture(texture) {
        const device = this.app.layout.device;
        const temp = device.texture(Object.assign(Object.assign({}, texture.descriptor), { label: `${texture.descriptor.label}_temp` }));
        const ioGroup1 = this.app.layout.groupLayouts.filter1DIO.instance(`${texture.descriptor.label}_ioGroup1`, {
            direction: this.horizontal,
            source: texture.createView(),
            target: temp.createView()
        });
        const ioGroup2 = this.app.layout.groupLayouts.filter1DIO.instance(`${texture.descriptor.label}_ioGroup2`, {
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
}
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