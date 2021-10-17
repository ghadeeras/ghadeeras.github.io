import * as gputils from "../djee/gpu/utils.js";
import { Canvas } from "../djee/gpu/canvas.js";
import { Vec } from "../../ether/latest/index.js";
import { View } from "./view.js";

export class ViewGPU implements View {

    private canvas: Canvas
    private params: GPUBuffer
    private vertices: GPUBuffer
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
        private device: GPUDevice,
        adapter: GPUAdapter,
        canvasId: string,
        shaderModule: GPUShaderModule,
        center: Vec<2>,
        scale: number
    ) {
        this.paramsData.set(center, 0)
        this.paramsData[6] = scale
        this.paramsData[9] = julia ? 1 : 0 

        this.params = gputils.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.paramsData);
        this.vertices = gputils.createBuffer(device, GPUBufferUsage.VERTEX, new Float32Array([
            -1, +1,
            -1, -1,
            +1, +1,
            +1, -1
        ]))

        this.canvas = new Canvas(canvasId, device, adapter)

        this.pipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
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
            fragment: {
                module: shaderModule,
                entryPoint: "f_main",
                targets: [{
                    format: this.canvas.format
                }]
            },
            primitive: {
                stripIndexFormat: "uint16",
                topology: "triangle-strip"
            },
            multisample: {
                count: this.canvas.sampleCount
            }
        })

        this.paramsGroup = gputils.createBindGroup(device, this.pipeline.getBindGroupLayout(0), [this.params])

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
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 2, 0)
    }

    setColor(h: number, s: number): void {
        this.paramsData.set([h, s], 2)
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 2, 2)
    }
    
    get hue(): number {
        return this.paramsData[2]
    }

    set hue(h: number) {
        this.paramsData[2] = h
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 2)
    }

    get saturation(): number {
        return this.paramsData[3]
    }

    set saturation(s: number) {
        this.paramsData[3] = s
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 3)
    }

    get juliaNumber(): Vec<2> {
        return [this.paramsData[4], this.paramsData[5]]
    }
    
    set juliaNumber(j: Vec<2>) {
        this.paramsData.set(j, 4)
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 2, 4)
    }
    
    get scale(): number {
        return this.paramsData[6]
    }

    set scale(s: number) {
        this.paramsData[6] = s
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 6)
    }

    get intensity(): number {
        return this.paramsData[7]
    }

    set intensity(i: number) {
        this.paramsData[7] = i
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 7)
    }

    get palette(): number {
        return this.paramsData[8]
    }

    set palette(p: number) {
        this.paramsData[8] = p
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 8)
    }

    private draw() {
        const command = gputils.encodeCommand(this.device, encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 0, g: 0, b: 0, a: 1 })]
            };
            gputils.renderPass(encoder, passDescriptor, pass => {
                pass.setPipeline(this.pipeline)
                pass.setVertexBuffer(0, this.vertices)
                pass.setBindGroup(0, this.paramsGroup)
                pass.draw(4)
            })
        })
        this.device.queue.submit([command])
    }

}

export async function viewGPU(julia: boolean, canvasId: string, center: Vec<2>, scale: number): Promise<View> {
    const [device, adapter] = await gputils.gpuObjects()
    const shaderCode = await gputils.loadShaderModule(device, "mandelbrot.wgsl")
    return new ViewGPU(julia, device, adapter, canvasId, shaderCode, center, scale)
}

export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}