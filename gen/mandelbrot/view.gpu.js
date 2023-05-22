var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { gear } from "/gen/libs.js";
import * as gpu from "../djee/gpu/index.js";
export class ViewGPU {
    constructor(device, canvasId, shaderModule, center, scale) {
        this.device = device;
        this.uniformsStruct = gpu.struct({
            center: gpu.f32.x2,
            color: gpu.f32.x2,
            scale: gpu.f32,
            intensity: gpu.f32,
            xray: gpu.u32,
            crosshairs: gpu.u32
        });
        this.uniforms = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsStruct.view([{
                center: center,
                color: [5 / 4, Math.sqrt(2) / 2],
                scale: scale,
                intensity: 0.5,
                xray: 0,
                crosshairs: 1,
            }]));
        this.gpuCanvas = device.canvas(canvasId, 4);
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
    get xray() {
        return this.uniforms.get(this.uniformsStruct.members.xray) != 0;
    }
    set xray(b) {
        this.uniforms.set(this.uniformsStruct.members.xray, b ? 1 : 0);
    }
    get crosshairs() {
        return this.uniforms.get(this.uniformsStruct.members.crosshairs) != 0;
    }
    set crosshairs(b) {
        this.uniforms.set(this.uniformsStruct.members.crosshairs, b ? 1 : 0);
    }
    resize() {
        return this.gpuCanvas.resize();
    }
    render() {
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
export function viewGPU(canvasId, center, scale) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpu.Device.instance();
        const code = yield gear.loops.fetchTextFile("/shaders/mandelbrot.wgsl");
        const shaderModule = yield device.shaderModule("mandelbrot", gpu.renderingShaders.fullScreenPass(code));
        return new ViewGPU(device, canvasId, shaderModule, center, scale);
    });
}
export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
//# sourceMappingURL=view.gpu.js.map