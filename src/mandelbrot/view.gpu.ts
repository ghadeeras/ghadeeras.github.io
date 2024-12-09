import * as aether from "aether"
import * as gear from "gear"
import { gpu } from "lumen";
import { View } from "./view.js";

export class ViewGPU implements View {

    private gpuCanvas: gpu.Canvas
    private uniforms: gpu.SyncBuffer
    private pipeline: GPURenderPipeline
    private paramsGroup: GPUBindGroup

    private readonly uniformsStruct = gpu.struct({
        center: gpu.f32.x2,
        color: gpu.f32.x2,
        scale: gpu.f32,
        intensity: gpu.f32,
        xray: gpu.u32,
        crosshairs: gpu.u32
    }) 

    constructor(
        private device: gpu.Device,
        canvasId: string,
        shaderModule: gpu.ShaderModule,
        center: aether.Vec<2>,
        scale: number
    ) {
        this.uniforms = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.view([{
            center: center,
            color: [5 / 4, Math.sqrt(2) / 2],
            scale: scale,
            intensity: 0.5,
            xray: 0,
            crosshairs: 1,
        }]));

        this.gpuCanvas = device.canvas(canvasId, 4)

        this.pipeline = device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [this.gpuCanvas]),
            primitive: {
                stripIndexFormat: "uint16",
                topology: "triangle-strip"
            },
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
            layout: "auto"
        })

        this.paramsGroup = device.bindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms])
    }

    get canvas() {
        return this.gpuCanvas.element
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

    get xray(): boolean {
        return this.uniforms.get(this.uniformsStruct.members.xray) != 0
    }

    set xray(b: boolean) {
        this.uniforms.set(this.uniformsStruct.members.xray, b ? 1 : 0)
    }

    get crosshairs(): boolean {
        return this.uniforms.get(this.uniformsStruct.members.crosshairs) != 0
    }

    set crosshairs(b: boolean) {
        this.uniforms.set(this.uniformsStruct.members.crosshairs, b ? 1 : 0)
    }

    resize(): void {
        return this.gpuCanvas.resize();
    }

    render() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r: 0, g: 0, b: 0, a: 1 })]
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.paramsGroup)
                pass.draw(4)
            })
        })
    }

}

export async function viewGPU(canvasId: string, center: aether.Vec<2>, scale: number): Promise<View> {
    const device = await gpu.Device.instance()
    const code = await gear.fetchTextFile("/shaders/mandelbrot.wgsl")
    const shaderModule = await device.shaderModule("mandelbrot", gpu.renderingShaders.fullScreenPass(code))
    return new ViewGPU(device, canvasId, shaderModule, center, scale)
}

export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}