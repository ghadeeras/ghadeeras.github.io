import * as gpu from "lumen";
import * as gear from "gear";
export class Filter1D {
    constructor(app, weights, workgroupSize, count) {
        this.app = app;
        this.weights = weights;
        this.workgroupSize = workgroupSize;
        this.count = count;
        const buffers = app.device.dataBuffers({
            horizontal: {
                usage: ["UNIFORM"],
                data: gpu.u32.view([0])
            },
            vertical: {
                usage: ["UNIFORM"],
                data: gpu.u32.view([1])
            },
            weights: {
                usage: ["STORAGE"],
                data: gpu.f32.view(this.weights)
            }
        });
        this.horizontal = buffers.horizontal;
        this.vertical = buffers.vertical;
        this.filterGroup = app.layout.groupLayouts.filter1D.bindGroup({
            weights: buffers.weights
        }, "filterWeightsGroup");
    }
    forTexture(texture) {
        const device = this.app.device;
        const temp = device.texture({
            ...texture.descriptor,
            label: `${texture.descriptor.label}_temp`
        });
        const { ioGroup1, ioGroup2 } = this.app.layout.groupLayouts.filter1DIO.bindGroups({
            ioGroup1: {
                direction: this.horizontal,
                source: texture.createView(),
                target: temp.createView()
            },
            ioGroup2: {
                direction: this.vertical,
                source: temp.createView(),
                target: texture.createView()
            }
        });
        const wgCountX = Math.ceil(texture.size.width / this.workgroupSize[0]);
        const wgCountY = Math.ceil(gear.required(texture.size.height) / this.workgroupSize[1]);
        console.log(`Filter Workgroups Count: [${wgCountX}, ${wgCountY}]`);
        let pass = this.app.pipelines.filter1D
            .withGroups({ filter: this.filterGroup })
            .withGroups({ io: ioGroup1 }).dispatchWorkGroups(wgCountX, wgCountY)
            .withGroups({ io: ioGroup2 }).dispatchWorkGroups(wgCountX, wgCountY);
        for (let i = 1; i < this.count; i++) {
            pass = pass
                .withGroups({ io: ioGroup1 }).dispatchWorkGroups(wgCountX, wgCountY)
                .withGroups({ io: ioGroup2 }).dispatchWorkGroups(wgCountX, wgCountY);
        }
        return new Filtering1D(encoder => encoder.computePass("filter", passEncoder => pass.inlineIn(passEncoder)), () => temp.destroy());
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