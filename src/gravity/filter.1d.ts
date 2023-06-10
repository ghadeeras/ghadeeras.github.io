import * as gpu from '../djee/gpu/index.js'
import { gear } from '../libs.js'

export class Filter1D {

    private static filterGroupLayoutEntries = {
        filter: {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
                type: "storage"
            }
        }
    } satisfies gpu.BindGroupLayoutEntries
    
    private static ioGroupLayoutEntries = {
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
    } satisfies gpu.BindGroupLayoutEntries

    private filterGroup: gpu.BindGroup<typeof Filter1D.filterGroupLayoutEntries>
    private ioGroup1: gpu.BindGroup<typeof Filter1D.ioGroupLayoutEntries>
    private ioGroup2: gpu.BindGroup<typeof Filter1D.ioGroupLayoutEntries>

    private pipeline: gpu.ComputePipeline<ReturnType<typeof Filter1D.newPipelineLayout>>

    constructor(private workgroupSize: number, shader: gpu.ShaderModule, private texture: gpu.Texture, weights: number[]) {
        const device = shader.device
        const filterGroupLayout = device.groupLayout("filterGroupLayout", Filter1D.filterGroupLayoutEntries)
        const ioGroupLayout = device.groupLayout("ioGroupLayout", Filter1D.ioGroupLayoutEntries)
        const pipelineLayout = device.pipelineLayout("filterPipeline", Filter1D.newPipelineLayout(filterGroupLayout, ioGroupLayout))
        
        const temp = device.texture({
            ...texture.descriptor,
            label: "temp"
        })
        
        this.filterGroup = filterGroupLayout.instance("filterWeightsGroup", {
            filter: device.buffer("filterWeightsBuffer", GPUBufferUsage.STORAGE, gpu.f32.view(weights))
        })
        this.ioGroup1 = ioGroupLayout.instance("ioGroup1", {
            direction: device.buffer("ioGroup1.direction", GPUBufferUsage.UNIFORM, gpu.u32.view([0])),
            source: texture.createView(),
            target: temp.createView()
        })
        this.ioGroup2 = ioGroupLayout.instance("ioGroup1", {
            direction: device.buffer("ioGroup2.direction", GPUBufferUsage.UNIFORM, gpu.u32.view([1])),
            source: temp.createView(),
            target: texture.createView()
        })

        this.pipeline = pipelineLayout.computeInstance(shader, "c_main")
    }

    apply() {
        const device = this.pipeline.module.device
        device.enqueueCommand("filtering", encoder => {
            encoder.computePass(pass => {
                this.pipeline.addTo(pass, {
                    filter: this.filterGroup,
                    io: this.ioGroup1
                })
                pass.dispatchWorkgroups(
                    Math.ceil(this.texture.size.width / this.workgroupSize), 
                    Math.ceil(gear.required(this.texture.size.height) / this.workgroupSize)
                )
                this.pipeline.addGroupsTo(pass, {
                    io: this.ioGroup2
                })
                pass.dispatchWorkgroups(
                    Math.ceil(this.texture.size.width / this.workgroupSize), 
                    Math.ceil(gear.required(this.texture.size.height) / this.workgroupSize)
                )
            })
        })
    }

    static newPipelineLayout(filterGroupLayout: gpu.BindGroupLayout<typeof Filter1D.filterGroupLayoutEntries>, ioGroupLayout: gpu.BindGroupLayout<typeof Filter1D.ioGroupLayoutEntries>) {
        return {
            "filter": filterGroupLayout.asGroup(0),
            "io": ioGroupLayout.asGroup(1)
        }
    }

    static async create(workgroupSize: number, device: gpu.Device, texture: gpu.Texture, weights: number[]): Promise<Filter1D> {
        const ws = 1 >> Math.floor(Math.log2(Math.sqrt(workgroupSize)))
        const shader = await device.loadShaderModule("filter-1d", s => s.replace(/\[\[workgroup_size\]\]/g, ws.toString()))
        return new Filter1D(ws, shader, texture, weights)
    } 

}
