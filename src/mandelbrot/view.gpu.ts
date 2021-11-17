import * as gpu from "../djee/gpu/index.js";
import { Vec } from "../../ether/latest/index.js";
import { View } from "./view.js";

export class ViewGPU implements View {

    private canvas: gpu.Canvas
    private params: gpu.Buffer
    private vertices: gpu.Buffer
    private pipeline: GPURenderPipeline
    private paramsGroup: GPUBindGroup

    private paramsData: Float32Array = new Float32Array([
        0, 0, // center: vec2<f32>;
        5 / 4, Math.sqrt(2) / 2, // color: vec2<f32>;
        0, 0, // juliaNumber: vec2<f32>;
        0, // scale: f32;
        0.5, // intensity: f32;
        0, // palette: f32;
        0, // julia: f32 (as boolean);
    ])

    constructor(
        readonly julia: boolean,
        private device: gpu.Device,
        canvasId: string,
        shaderModule: gpu.ShaderModule,
        center: Vec<2>,
        scale: number
    ) {
        this.paramsData.set(center, 0)
        this.paramsData[6] = scale
        this.paramsData[9] = julia ? 1 : 0 

        this.params = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, this.paramsData);
        this.vertices = device.buffer(GPUBufferUsage.VERTEX, 2 * 4, new Float32Array([
            -1, +1,
            -1, -1,
            +1, +1,
            +1, -1
        ]))

        this.canvas = device.canvas(canvasId)

        this.pipeline = device.device.createRenderPipeline({
            vertex: {
                module: shaderModule.shaderModule,
                entryPoint: "v_main",
                buffers: [{
                    arrayStride: 2 * 4,
                    attributes: [{
                        shaderLocation: 0,
                        format: "float32x2",
                        offset: 0
                    }]
                }]
            },
            fragment: shaderModule.fragmentState("f_main", [this.canvas]),
            primitive: {
                stripIndexFormat: "uint16",
                topology: "triangle-strip"
            },
            multisample: {
                count: this.canvas.sampleCount
            }
        })

        this.paramsGroup = device.createBindGroup(this.pipeline.getBindGroupLayout(0), [this.params])

        const frame = () => {
            this.draw()
            requestAnimationFrame(frame)
        }
        frame()
    }
    
    get center(): Vec<2> {
        return [this.paramsData[0], this.paramsData[1]]
    }

    set center(c: Vec<2>) {
        this.paramsData.set(c, 0)
        this.params.writeAt(0 * 4, this.paramsData, 0, 2)
    }

    setColor(h: number, s: number): void {
        this.paramsData.set([h, s], 2)
        this.params.writeAt(2 * 4, this.paramsData, 2, 2)
    }
    
    get hue(): number {
        return this.paramsData[2]
    }

    set hue(h: number) {
        this.paramsData[2] = h
        this.params.writeAt(2 * 4, this.paramsData, 2, 1)
    }

    get saturation(): number {
        return this.paramsData[3]
    }

    set saturation(s: number) {
        this.paramsData[3] = s
        this.params.writeAt(3 * 4, this.paramsData, 3, 1)
    }

    get juliaNumber(): Vec<2> {
        return [this.paramsData[4], this.paramsData[5]]
    }
    
    set juliaNumber(j: Vec<2>) {
        this.paramsData.set(j, 4)
        this.params.writeAt(4 * 4, this.paramsData, 4, 2)
    }
    
    get scale(): number {
        return this.paramsData[6]
    }

    set scale(s: number) {
        this.paramsData[6] = s
        this.params.writeAt(6 * 4, this.paramsData, 6, 1)
    }

    get intensity(): number {
        return this.paramsData[7]
    }

    set intensity(i: number) {
        this.paramsData[7] = i
        this.params.writeAt(7 * 4, this.paramsData, 7, 1)
    }

    get palette(): number {
        return this.paramsData[8]
    }

    set palette(p: number) {
        this.paramsData[8] = p
        this.params.writeAt(8 * 4, this.paramsData, 8, 1)
    }

    private draw() {
        this.device.enqueueCommand(encoder => {
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

export async function viewGPU(julia: boolean, canvasId: string, center: Vec<2>, scale: number): Promise<View> {
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