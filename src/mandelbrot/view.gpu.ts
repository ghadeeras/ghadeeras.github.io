import { aether } from "/gen/libs.js";
import * as gpu from "../djee/gpu/index.js";
import { View } from "./view.js";

export class ViewGPU implements View {

    private vertex = gpu.vertex({
        position: gpu.f32.x2
    })

    private canvas: gpu.Canvas
    private uniforms: gpu.SyncBuffer
    private vertices: gpu.Buffer
    private pipeline: GPURenderPipeline
    private paramsGroup: GPUBindGroup

    private readonly uniformsStruct = gpu.struct({
        center: gpu.f32.x2,
        color: gpu.f32.x2,
        juliaNumber: gpu.f32.x2,
        scale: gpu.f32,
        intensity: gpu.f32,
        palette: gpu.f32,
        julia: gpu.f32,
    }) 

    constructor(
        readonly julia: boolean,
        private device: gpu.Device,
        canvasId: string,
        shaderModule: gpu.ShaderModule,
        center: aether.Vec<2>,
        scale: number
    ) {
        this.uniforms = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.view([{
            center: center,
            color: [5 / 4, Math.sqrt(2) / 2],
            juliaNumber: [0, 0],
            scale: scale,
            intensity: 0.5,
            palette: 0,
            julia: this.julia ? 1 : 0
        }]));
        this.vertices = device.buffer("vertices", GPUBufferUsage.VERTEX, gpu.dataView(new Float32Array([
            -1, +1,
            -1, -1,
            +1, +1,
            +1, -1
        ])))

        this.canvas = device.canvas(canvasId)

        this.pipeline = device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [this.vertex.asBufferLayout()]),
            fragment: shaderModule.fragmentState("f_main", [this.canvas]),
            primitive: {
                stripIndexFormat: "uint16",
                topology: "triangle-strip"
            },
            multisample: {
                count: this.canvas.sampleCount
            },
            layout: "auto"
        })

        this.paramsGroup = device.bindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms])

        const frame = () => {
            this.draw()
            requestAnimationFrame(frame)
        }
        frame()
    }
    
    get center(): aether.Vec<2> {
        return this.uniforms.get(this.uniformsStruct.members.center)
    }

    set center(c: aether.Vec<2>) {
        this.uniforms.set(this.uniformsStruct.members.center, c)
    }

    setColor(h: number, s: number): void {
        this.uniforms.set(this.uniformsStruct.members.color, [h, s])
    }
    
    get hue(): number {
        return this.uniforms.get(this.uniformsStruct.members.color.x)
    }

    set hue(h: number) {
        this.uniforms.set(this.uniformsStruct.members.color.x, h)
    }

    get saturation(): number {
        return this.uniforms.get(this.uniformsStruct.members.color.y)
    }

    set saturation(s: number) {
        this.uniforms.set(this.uniformsStruct.members.color.y, s)
    }

    get juliaNumber(): aether.Vec<2> {
        return this.uniforms.get(this.uniformsStruct.members.juliaNumber)
    }
    
    set juliaNumber(j: aether.Vec<2>) {
        this.uniforms.set(this.uniformsStruct.members.juliaNumber, j)
    }
    
    get scale(): number {
        return this.uniforms.get(this.uniformsStruct.members.scale)
    }

    set scale(s: number) {
        this.uniforms.set(this.uniformsStruct.members.scale, s)
    }

    get intensity(): number {
        return this.uniforms.get(this.uniformsStruct.members.intensity)
    }

    set intensity(i: number) {
        this.uniforms.set(this.uniformsStruct.members.intensity, i)
    }

    get palette(): number {
        return this.uniforms.get(this.uniformsStruct.members.palette)
    }

    set palette(p: number) {
        this.uniforms.set(this.uniformsStruct.members.palette, p)
    }

    private draw() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 0, g: 0, b: 0, a: 1 })]
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setVertexBuffer(0, this.vertices.buffer)
                pass.setBindGroup(0, this.paramsGroup)
                pass.draw(4)
            })
        })
    }

}

export async function viewGPU(julia: boolean, canvasId: string, center: aether.Vec<2>, scale: number): Promise<View> {
    const device = await gpu.Device.instance()
    const shaderModule = await device.loadShaderModule("mandelbrot.wgsl")
    return new ViewGPU(julia, device, canvasId, shaderModule, center, scale)
}

export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}