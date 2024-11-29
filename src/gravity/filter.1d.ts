import * as gpu from '../djee/gpu/index.js'
import * as meta from './meta.js'
import { gear } from '../libs.js'

export class Filter1D {

    private pipeline
    private filterGroup

    private horizontal: gpu.Buffer
    private vertical: gpu.Buffer

    constructor(private app: meta.App, private weights: number[], private workgroupSize: [number, number]) {
        this.pipeline = app.layout.pipelineLayouts.filtering.computeInstance(app.shaders.bloom, "c_main")
        this.horizontal = app.device.buffer(`ioGroup0.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([0]))
        this.vertical = app.device.buffer(`ioGroup1.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([1]))
        this.filterGroup = app.layout.groupLayouts.filter1D.instance(`filterWeightsGroup`, {
            weights: app.device.buffer(`filterWeightsBuffer`, GPUBufferUsage.STORAGE, gpu.f32.view(this.weights))
        })
    }

    forTexture(texture: gpu.Texture): Filtering1D {
        const device = this.app.device
        const temp = device.texture({
            ...texture.descriptor,
            label: `${texture.descriptor.label}_temp`
        })
        const ioGroup1 = this.app.layout.groupLayouts.filter1DIO.instance(`${texture.descriptor.label}_ioGroup1`, {
            direction: this.horizontal,
            source: texture.createView(),
            target: temp.createView()
        })
        const ioGroup2 = this.app.layout.groupLayouts.filter1DIO.instance(`${texture.descriptor.label}_ioGroup2`, {
            direction: this.vertical,
            source: temp.createView(),
            target: texture.createView()
        })
        const wgCountX =  Math.ceil(texture.size.width / this.workgroupSize[0])
        const wgCountY = Math.ceil(gear.required(texture.size.height) / this.workgroupSize[1])
        console.log(`Filter Workgroups Count: [${wgCountX}, ${wgCountY}]`)
        return new Filtering1D(
            (encoder, count = 1) => {
                encoder.computePass(pass => {
                    this.pipeline.addTo(pass, { filter: this.filterGroup })
                    for (let i = 0; i < count; i++) {
                        this.pipeline.addGroupsTo(pass, { io: ioGroup1 })
                        pass.dispatchWorkgroups(wgCountX, wgCountY)
                        this.pipeline.addGroupsTo(pass, { io: ioGroup2 })
                        pass.dispatchWorkgroups(wgCountX, wgCountY)
                    }
                })
                    },
            () => temp.destroy()
        )
    }

}

export class Filtering1D {

    constructor(readonly apply: (encoder: gpu.CommandEncoder, count?: number) => void, readonly destroy: () => void) {}
    
}

export function gaussianWeights(relativeMinValue: number, count: number): number[] {
    const result: number[] = [1]
    const c = Math.log(relativeMinValue) / (count * count)
    let sum = 1
    for (let i = 1; i < count; i++) {
        const w = Math.exp(c * i * i)
        result.push(w)
        sum += 2 * w
    }
    return result.map(w => w / sum)
}