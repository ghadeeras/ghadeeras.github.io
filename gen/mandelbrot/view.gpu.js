var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gputils from "../djee/gpu/utils.js";
import { Canvas } from "../djee/gpu/canvas.js";
export class ViewGPU {
    constructor(julia, device, adapter, canvasId, shaderModule, center, scale) {
        this.julia = julia;
        this.device = device;
        this.paramsData = new Float32Array([
            0, 0,
            5 / 4, Math.sqrt(2) / 2,
            0, 0,
            0,
            0.5,
            0,
            0, // julia: f32 (as boolean);
        ]);
        this.paramsData.set(center, 0);
        this.paramsData[6] = scale;
        this.paramsData[9] = julia ? 1 : 0;
        this.params = gputils.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.paramsData);
        this.vertices = gputils.createBuffer(device, GPUBufferUsage.VERTEX, new Float32Array([
            -1, +1,
            -1, -1,
            +1, +1,
            +1, -1
        ]));
        this.canvas = new Canvas(canvasId, device, adapter);
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
        });
        this.paramsGroup = gputils.createBindGroup(device, this.pipeline.getBindGroupLayout(0), [this.params]);
        const frame = () => {
            this.draw();
            requestAnimationFrame(frame);
        };
        frame();
    }
    get center() {
        return [this.paramsData[0], this.paramsData[1]];
    }
    set center(c) {
        this.paramsData.set(c, 0);
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 2, 0);
    }
    setColor(h, s) {
        this.paramsData.set([h, s], 2);
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 2, 2);
    }
    get hue() {
        return this.paramsData[2];
    }
    set hue(h) {
        this.paramsData[2] = h;
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 2);
    }
    get saturation() {
        return this.paramsData[3];
    }
    set saturation(s) {
        this.paramsData[3] = s;
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 3);
    }
    get juliaNumber() {
        return [this.paramsData[4], this.paramsData[5]];
    }
    set juliaNumber(j) {
        this.paramsData.set(j, 4);
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 2, 4);
    }
    get scale() {
        return this.paramsData[6];
    }
    set scale(s) {
        this.paramsData[6] = s;
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 6);
    }
    get intensity() {
        return this.paramsData[7];
    }
    set intensity(i) {
        this.paramsData[7] = i;
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 7);
    }
    get palette() {
        return this.paramsData[8];
    }
    set palette(p) {
        this.paramsData[8] = p;
        gputils.writeToBuffer(this.device, this.params, this.paramsData, 1, 8);
    }
    draw() {
        const command = gputils.encodeCommand(this.device, encoder => {
            const passDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 0, g: 0, b: 0, a: 1 })]
            };
            gputils.renderPass(encoder, passDescriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setVertexBuffer(0, this.vertices);
                pass.setBindGroup(0, this.paramsGroup);
                pass.draw(4);
            });
        });
        this.device.queue.submit([command]);
    }
}
export function viewGPU(julia, canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        const [device, adapter] = yield gputils.gpuObjects();
        const shaderCode = yield gputils.loadShaderModule(device, "mandelbrot.wgsl");
        return new ViewGPU(julia, device, adapter, canvasId, shaderCode, center, scale);
    });
}
export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
//# sourceMappingURL=view.gpu.js.map