import { gpu } from 'lumen';
import * as gear from "gear";
export class Filter1D {
    constructor(app, weights, workgroupSize) {
        this.app = app;
        this.weights = weights;
        this.workgroupSize = workgroupSize;
        this.pipeline = app.layout.pipelineLayouts.filtering.computeInstance(app.shaders.bloom, "c_main");
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
        this.filterGroup = app.layout.groupLayouts.filter1D.instance({
            label: "filterWeightsGroup",
            entries: {
                weights: buffers.weights
            }
        });
    }
    forTexture(texture) {
        const device = this.app.device;
        const temp = device.texture({
            ...texture.descriptor,
            label: `${texture.descriptor.label}_temp`
        });
        const { ioGroup1, ioGroup2 } = this.app.layout.groupLayouts.filter1DIO.instances({
            ioGroup1: {
                entries: {
                    direction: this.horizontal,
                    source: texture.createView(),
                    target: temp.createView()
                }
            },
            ioGroup2: {
                entries: {
                    direction: this.vertical,
                    source: temp.createView(),
                    target: texture.createView()
                }
            }
        });
        const wgCountX = Math.ceil(texture.size.width / this.workgroupSize[0]);
        const wgCountY = Math.ceil(gear.required(texture.size.height) / this.workgroupSize[1]);
        console.log(`Filter Workgroups Count: [${wgCountX}, ${wgCountY}]`);
        return new Filtering1D((encoder, count = 1) => {
            encoder.computePass(pass => {
                this.pipeline.addTo(pass, { filter: this.filterGroup });
                for (let i = 0; i < count; i++) {
                    this.pipeline.addGroupsTo(pass, { io: ioGroup1 });
                    pass.dispatchWorkgroups(wgCountX, wgCountY);
                    this.pipeline.addGroupsTo(pass, { io: ioGroup2 });
                    pass.dispatchWorkgroups(wgCountX, wgCountY);
                }
            });
        }, () => temp.destroy());
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