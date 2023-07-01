import * as gpu from '../djee/gpu/index.js'
import * as meta from './meta.js'
import { gear } from '../libs.js'

export class Filter1D {

    private pipeline: meta.FilteringPipeline

    private horizontal: gpu.Buffer
    private vertical: gpu.Buffer
    private filterGroup: meta.Filter1DBindGroup

    constructor(private layout: meta.AppLayout, shader: gpu.ShaderModule, private weights: number[], private workgroupSize: [number, number]) {
        const device = layout.device
        this.pipeline = layout.pipelineLayouts.filtering.computeInstance(shader, "c_main")
        this.horizontal = device.buffer(`ioGroup0.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([0]))
        this.vertical = device.buffer(`ioGroup1.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([1]))
        this.filterGroup = layout.groupLayouts.filter1D.instance(`filterWeightsGroup`, {
            weights: device.buffer(`filterWeightsBuffer`, GPUBufferUsage.STORAGE, gpu.f32.view(this.weights))
        })
    }

    forTexture(texture: gpu.Texture): Filtering1D {
        const device = this.layout.device
        const temp = device.texture({
            ...texture.descriptor,
            label: `${texture.descriptor.label}_temp`
        })
        const ioGroup1 = this.layout.groupLayouts.filter1DIO.instance(`${texture.descriptor.label}_ioGroup1`, {
            direction: this.horizontal,
            source: texture.createView(),
            target: temp.createView()
        })
        const ioGroup2 = this.layout.groupLayouts.filter1DIO.instance(`${texture.descriptor.label}_ioGroup2`, {
            direction: this.vertical,
            source: temp.createView(),
            target: texture.createView()
        })
        const wgCountX =  Math.ceil(texture.size.width / this.workgroupSize[0])
        const wgCountY = Math.ceil(gear.required(texture.size.height) / this.workgroupSize[1])
        console.log(`Filter Workgroups Count: [${wgCountX}, ${wgCountY}]`)
        return new Filtering1D(
            (encoder, count = 1) => this.pass(ioGroup1, ioGroup2, wgCountX, wgCountY, encoder, count),
            () => temp.destroy()
        )
    }

    private pass(
        ioGroup1: meta.Filter1DIOBindGroup,
        ioGroup2: meta.Filter1DIOBindGroup,
        wgCountX: number, 
        wgCountY: number,
        encoder: gpu.CommandEncoder, 
        count: number
    ) {
        encoder.computePass(pass => {
            this.pipeline.addTo(pass, { filter: this.filterGroup })
            for (let i = 0; i < count; i++) {
                this.pipeline.addGroupsTo(pass, { io: ioGroup1 })
                pass.dispatchWorkgroups(wgCountX, wgCountY)
                this.pipeline.addGroupsTo(pass, { io: ioGroup2 })
                pass.dispatchWorkgroups(wgCountX, wgCountY)
            }
        })
    }

    static async create(layout: meta.AppLayout, weights: number[]): Promise<Filter1D> {
        const device = layout.device
        const [wgMaxX, wgMaxY] = [device.device.limits.maxComputeWorkgroupSizeX, device.device.limits.maxComputeWorkgroupSizeY]
        const wgS = 2 ** Math.floor(Math.log2(wgMaxX * wgMaxY) / 4)
        const wgX = Math.min(wgS, wgMaxX); 
        const wgY = 2 ** Math.floor(Math.log2(wgMaxY / wgX)); 
        console.log(`Filter Workgroup Size: [${wgX}, ${wgY}]`)
        const shader = await device.loadShaderModule("filter-1d.wgsl", s => s
            .replace(/\[\[workgroup_size_x\]\]/g, wgX.toString())
            .replace(/\[\[workgroup_size_y\]\]/g, wgY.toString())
        )
        return new Filter1D(layout, shader, weights, [wgX, wgY])
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