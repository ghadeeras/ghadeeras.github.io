var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from "../djee/gpu/index.js";
export class ViewGPU {
    constructor(julia, device, canvasId, shaderModule, center, scale) {
        this.julia = julia;
        this.device = device;
        this.vertex = gpu.vertex({
            position: gpu.f32.x2
        });
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
        this.params = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, this.paramsData);
        this.vertices = device.buffer(GPUBufferUsage.VERTEX, this.vertex.struct.stride, new Float32Array([
            -1, +1,
            -1, -1,
            +1, +1,
            +1, -1
        ]));
        this.canvas = device.canvas(canvasId);
        this.pipeline = device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [this.vertex.asBufferLayout()]),
            fragment: shaderModule.fragmentState("f_main", [this.canvas]),
            primitive: {
                stripIndexFormat: "uint16",
                topology: "triangle-strip"
            },
            multisample: {
                count: this.canvas.sampleCount
            }
        });
        this.paramsGroup = device.createBindGroup(this.pipeline.getBindGroupLayout(0), [this.params]);
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
        this.params.writeAt(0 * 4, this.paramsData, 0, 2);
    }
    setColor(h, s) {
        this.paramsData.set([h, s], 2);
        this.params.writeAt(2 * 4, this.paramsData, 2, 2);
    }
    get hue() {
        return this.paramsData[2];
    }
    set hue(h) {
        this.paramsData[2] = h;
        this.params.writeAt(2 * 4, this.paramsData, 2, 1);
    }
    get saturation() {
        return this.paramsData[3];
    }
    set saturation(s) {
        this.paramsData[3] = s;
        this.params.writeAt(3 * 4, this.paramsData, 3, 1);
    }
    get juliaNumber() {
        return [this.paramsData[4], this.paramsData[5]];
    }
    set juliaNumber(j) {
        this.paramsData.set(j, 4);
        this.params.writeAt(4 * 4, this.paramsData, 4, 2);
    }
    get scale() {
        return this.paramsData[6];
    }
    set scale(s) {
        this.paramsData[6] = s;
        this.params.writeAt(6 * 4, this.paramsData, 6, 1);
    }
    get intensity() {
        return this.paramsData[7];
    }
    set intensity(i) {
        this.paramsData[7] = i;
        this.params.writeAt(7 * 4, this.paramsData, 7, 1);
    }
    get palette() {
        return this.paramsData[8];
    }
    set palette(p) {
        this.paramsData[8] = p;
        this.params.writeAt(8 * 4, this.paramsData, 8, 1);
    }
    draw() {
        this.device.enqueueCommand(encoder => {
            const passDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 0, g: 0, b: 0, a: 1 })]
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setVertexBuffer(0, this.vertices.buffer);
                pass.setBindGroup(0, this.paramsGroup);
                pass.draw(4);
            });
        });
    }
}
export function viewGPU(julia, canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpu.Device.instance();
        const shaderModule = yield device.loadShaderModule("mandelbrot.wgsl");
        return new ViewGPU(julia, device, canvasId, shaderModule, center, scale);
    });
}
export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
//# sourceMappingURL=view.gpu.js.map