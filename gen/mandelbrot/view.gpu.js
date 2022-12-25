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
import { fetchTextFile } from "../utils/gear.js";
export class ViewGPU {
    constructor(julia, device, canvasId, shaderModule, center, scale) {
        this.julia = julia;
        this.device = device;
        this.uniformsStruct = gpu.struct({
            center: gpu.f32.x2,
            color: gpu.f32.x2,
            scale: gpu.f32,
            intensity: gpu.f32,
            palette: gpu.f32,
        });
        this.uniforms = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.view([{
                center: center,
                color: [5 / 4, Math.sqrt(2) / 2],
                scale: scale,
                intensity: 0.5,
                palette: 0,
            }]));
        this.gpuCanvas = device.canvas(canvasId);
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
        });
        this.paramsGroup = device.bindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms]);
        const frame = () => {
            this.draw();
            requestAnimationFrame(frame);
        };
        frame();
    }
    get canvas() {
        return this.gpuCanvas.element;
    }
    get center() {
        return this.uniforms.get(this.uniformsStruct.members.center);
    }
    set center(c) {
        this.uniforms.set(this.uniformsStruct.members.center, c);
    }
    setColor(h, s) {
        this.uniforms.set(this.uniformsStruct.members.color, [h, s]);
    }
    get hue() {
        return this.uniforms.get(this.uniformsStruct.members.color.x);
    }
    set hue(h) {
        this.uniforms.set(this.uniformsStruct.members.color.x, h);
    }
    get saturation() {
        return this.uniforms.get(this.uniformsStruct.members.color.y);
    }
    set saturation(s) {
        this.uniforms.set(this.uniformsStruct.members.color.y, s);
    }
    get scale() {
        return this.uniforms.get(this.uniformsStruct.members.scale);
    }
    set scale(s) {
        this.uniforms.set(this.uniformsStruct.members.scale, s);
    }
    get intensity() {
        return this.uniforms.get(this.uniformsStruct.members.intensity);
    }
    set intensity(i) {
        this.uniforms.set(this.uniformsStruct.members.intensity, i);
    }
    get palette() {
        return this.uniforms.get(this.uniformsStruct.members.palette);
    }
    set palette(p) {
        this.uniforms.set(this.uniformsStruct.members.palette, p);
    }
    draw() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r: 0, g: 0, b: 0, a: 1 })]
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, this.paramsGroup);
                pass.draw(4);
            });
        });
    }
}
export function viewGPU(julia, canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpu.Device.instance();
        const code = yield fetchTextFile("/shaders/mandelbrot.wgsl");
        const shaderModule = yield device.shaderModule("mandelbrot", gpu.renderingShaders.fullScreenPass(code));
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