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
        this.uniformsStruct = gpu.struct({
            center: gpu.f32.x2,
            color: gpu.f32.x2,
            juliaNumber: gpu.f32.x2,
            scale: gpu.f32,
            intensity: gpu.f32,
            palette: gpu.f32,
            julia: gpu.f32,
        });
        this.uniformsView = this.uniformsStruct.view([{
                center: center,
                color: [5 / 4, Math.sqrt(2) / 2],
                juliaNumber: [0, 0],
                scale: scale,
                intensity: 0.5,
                palette: 0,
                julia: this.julia ? 1 : 0
            }]);
        this.uniforms = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsView);
        this.vertices = device.buffer(GPUBufferUsage.VERTEX, gpu.dataView(new Float32Array([
            -1, +1,
            -1, -1,
            +1, +1,
            +1, -1
        ])));
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
            },
            layout: "auto"
        });
        this.paramsGroup = device.createBindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms]);
        const frame = () => {
            this.draw();
            requestAnimationFrame(frame);
        };
        frame();
    }
    get center() {
        return this.getMember(this.uniformsStruct.members.center);
    }
    set center(c) {
        this.setMember(this.uniformsStruct.members.center, c);
    }
    setColor(h, s) {
        this.setMember(this.uniformsStruct.members.color, [h, s]);
    }
    get hue() {
        return this.getMember(this.uniformsStruct.members.color.x);
    }
    set hue(h) {
        this.setMember(this.uniformsStruct.members.color.x, h);
    }
    get saturation() {
        return this.getMember(this.uniformsStruct.members.color.y);
    }
    set saturation(s) {
        this.setMember(this.uniformsStruct.members.color.y, s);
    }
    get juliaNumber() {
        return this.getMember(this.uniformsStruct.members.juliaNumber);
    }
    set juliaNumber(j) {
        this.setMember(this.uniformsStruct.members.juliaNumber, j);
    }
    get scale() {
        return this.getMember(this.uniformsStruct.members.scale);
    }
    set scale(s) {
        this.setMember(this.uniformsStruct.members.scale, s);
    }
    get intensity() {
        return this.getMember(this.uniformsStruct.members.intensity);
    }
    set intensity(i) {
        this.setMember(this.uniformsStruct.members.intensity, i);
    }
    get palette() {
        return this.getMember(this.uniformsStruct.members.palette);
    }
    set palette(p) {
        this.setMember(this.uniformsStruct.members.palette, p);
    }
    getMember(member) {
        return member.read(this.uniformsView);
    }
    setMember(member, value) {
        member.write(this.uniformsView, value);
        this.uniforms.syncFrom(this.uniformsView, member);
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