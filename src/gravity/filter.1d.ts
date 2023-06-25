import * as gpu from '../djee/gpu/index.js'
import { gear } from '../libs.js'

export class Filter1D {

    private static filterGroupLayoutEntries = {
        filter: gpu.binding(0, GPUShaderStage.COMPUTE, gpu.buffer("read-only-storage"))
    } satisfies gpu.BindGroupLayoutEntries
    
    private static ioGroupLayoutEntries = {
        direction: gpu.binding(0, GPUShaderStage.COMPUTE, gpu.buffer("uniform")),
        source: gpu.binding(1, GPUShaderStage.COMPUTE, gpu.texture("float")),
        target: gpu.binding(2, GPUShaderStage.COMPUTE, gpu.storageTexture("rgba16float")),
    } satisfies gpu.BindGroupLayoutEntries

    private filterGroupLayout: gpu.BindGroupLayout<typeof Filter1D.filterGroupLayoutEntries>
    private ioGroupLayout: gpu.BindGroupLayout<typeof Filter1D.ioGroupLayoutEntries>

    private pipeline: gpu.ComputePipeline<ReturnType<typeof Filter1D.newPipelineLayoutEntries>>

    private horizontal: gpu.Buffer
    private vertical: gpu.Buffer
    private filterGroup: gpu.BindGroup<typeof Filter1D.filterGroupLayoutEntries>

    constructor(private shader: gpu.ShaderModule, private weights: number[], private workgroupSize: [number, number]) {
        const device = shader.device
        this.filterGroupLayout = device.groupLayout("filterGroupLayout", Filter1D.filterGroupLayoutEntries)
        this.ioGroupLayout = device.groupLayout("ioGroupLayout", Filter1D.ioGroupLayoutEntries)
        const pipelineLayout = device.pipelineLayout("filterPipeline", Filter1D.newPipelineLayoutEntries(
            this.filterGroupLayout, 
            this.ioGroupLayout
        ))
        this.pipeline = pipelineLayout.computeInstance(shader, "c_main")
        this.horizontal = device.buffer(`ioGroup0.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([0]))
        this.vertical = device.buffer(`ioGroup1.direction`, GPUBufferUsage.UNIFORM, gpu.u32.view([1]))
        this.filterGroup = this.filterGroupLayout.instance(`filterWeightsGroup`, {
            filter: device.buffer(`filterWeightsBuffer`, GPUBufferUsage.STORAGE, gpu.f32.view(this.weights))
        })
    }

    forTexture(texture: gpu.Texture): Filtering1D {
        const device = this.shader.device
        const temp = device.texture({
            ...texture.descriptor,
            label: `${texture.descriptor.label}_temp`
        })
        const ioGroup1 = this.ioGroupLayout.instance(`${texture.descriptor.label}_ioGroup1`, {
            direction: this.horizontal,
            source: texture.createView(),
            target: temp.createView()
        })
        const ioGroup2 = this.ioGroupLayout.instance(`${texture.descriptor.label}_ioGroup2`, {
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
        ioGroup1: gpu.BindGroup<typeof Filter1D.ioGroupLayoutEntries>,
        ioGroup2: gpu.BindGroup<typeof Filter1D.ioGroupLayoutEntries>,
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

    static newPipelineLayoutEntries(filterGroupLayout: gpu.BindGroupLayout<typeof Filter1D.filterGroupLayoutEntries>, ioGroupLayout: gpu.BindGroupLayout<typeof Filter1D.ioGroupLayoutEntries>) {
        return {
            "filter": filterGroupLayout.asGroup(0),
            "io": ioGroupLayout.asGroup(1)
        }
    }

    static async create(device: gpu.Device, weights: number[]): Promise<Filter1D> {
        const [wgMaxX, wgMaxY] = [device.device.limits.maxComputeWorkgroupSizeX, device.device.limits.maxComputeWorkgroupSizeY]
        const wgS = 2 ** Math.floor(Math.log2(wgMaxX * wgMaxY) / 4)
        const wgX = Math.min(wgS, wgMaxX); 
        const wgY = 2 ** Math.floor(Math.log2(wgMaxY / wgX)); 
        console.log(`Filter Workgroup Size: [${wgX}, ${wgY}]`)
        const shader = await device.loadShaderModule("filter-1d.wgsl", s => s
            .replace(/\[\[workgroup_size_x\]\]/g, wgX.toString())
            .replace(/\[\[workgroup_size_y\]\]/g, wgY.toString())
        )
        return new Filter1D(shader, weights, [wgX, wgY])
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