import { Vec } from "../../ether/latest";
import { View } from "./view";

export class ViewGPU implements View {

    private context: GPUCanvasContext
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
        shaderCode: string,
        center: Vec<2>,
        scale: number
    ) {
        this.paramsData.set(center, 0)
        this.paramsData[6] = scale
        this.paramsData[9] = julia ? 1 : 0 

        this.params = ViewGPU.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.paramsData);
        this.vertices = ViewGPU.createBuffer(device, GPUBufferUsage.VERTEX, new Float32Array([
            -1, +1,
            -1, -1,
            +1, +1,
            +1, -1
        ]))

        const canvas = document.getElementById(canvasId) as HTMLCanvasElement
        this.context = required(canvas.getContext("webgpu") ?? canvas.getContext("gpupresent"))
        const colorFormat = this.context.getPreferredFormat(adapter)
        this.context.configure({
            device: device,
            format: colorFormat
        })

        const shaderModule = device.createShaderModule({ code: shaderCode });
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
                    format: colorFormat
                }]
            },
            primitive: {
                stripIndexFormat: "uint16",
                topology: "triangle-strip"
            }
        })

        this.paramsGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                resource: { buffer: this.params },
                binding: 0
            }]
        });

        const frame = () => {
            this.draw()
            requestAnimationFrame(frame)
        }
        frame()
    }
    
    private static createBuffer(device: GPUDevice, usage: GPUBufferUsageFlags, data: ArrayLike<number> & ArrayBufferView) {
        const buffer = device.createBuffer({
            size: data.byteLength,
            usage: usage,
            mappedAtCreation: true
        });
        const array = new Float32Array(buffer.getMappedRange());
        array.set(data);
        buffer.unmap();
        return buffer;
    }

    get center(): Vec<2> {
        return [this.paramsData[0], this.paramsData[1]]
    }

    set center(c: Vec<2>) {
        this.paramsData.set(c, 0)
        this.device.queue.writeBuffer(this.params, 0 * 4, this.paramsData, 0, 2)
    }

    setColor(h: number, s: number): void {
        this.paramsData.set([h, s], 2)
        this.device.queue.writeBuffer(this.params, 2 * 4, this.paramsData, 2, 2)
    }
    
    get hue(): number {
        return this.paramsData[2]
    }

    set hue(h: number) {
        this.paramsData[2] = h
        this.device.queue.writeBuffer(this.params, 2 * 4, this.paramsData, 2, 1)
    }

    get saturation(): number {
        return this.paramsData[3]
    }

    set saturation(s: number) {
        this.paramsData[3] = s
        this.device.queue.writeBuffer(this.params, 3 * 4, this.paramsData, 3, 1)
    }

    get juliaNumber(): Vec<2> {
        return [this.paramsData[4], this.paramsData[5]]
    }
    
    set juliaNumber(j: Vec<2>) {
        this.paramsData.set(j, 4)
        this.device.queue.writeBuffer(this.params, 4 * 4, this.paramsData, 4, 2)
    }
    
    get scale(): number {
        return this.paramsData[6]
    }

    set scale(s: number) {
        this.paramsData[6] = s
        this.device.queue.writeBuffer(this.params, 6 * 4, this.paramsData, 6, 1)
    }

    get intensity(): number {
        return this.paramsData[7]
    }

    set intensity(i: number) {
        this.paramsData[7] = i
        this.device.queue.writeBuffer(this.params, 7 * 4, this.paramsData, 7, 1)
    }

    get palette(): number {
        return this.paramsData[8]
    }

    set palette(p: number) {
        this.paramsData[8] = p
        this.device.queue.writeBuffer(this.params, 8 * 4, this.paramsData, 8, 1)
    }

    private draw() {
        const encoder = this.device.createCommandEncoder()
        const passDescription: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: "store"
            }]
        };
        const pass = encoder.beginRenderPass(passDescription)
        pass.setPipeline(this.pipeline)
        pass.setVertexBuffer(0, this.vertices)
        pass.setBindGroup(0, this.paramsGroup)
        pass.draw(4)
        pass.endPass()
        this.device.queue.submit([encoder.finish()])
    }

}

export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}