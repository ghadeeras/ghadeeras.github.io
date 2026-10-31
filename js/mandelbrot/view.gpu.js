import * as gear from "gear";
import { gpu, wgl } from "lumen";
import { glWebGPU } from "webgxx";
export class ViewGPU {
    constructor(device, canvasId, vertexShader, fragmentShader, center, scale) {
        this.device = device;
        this.uniformsStruct = gpu.struct({
            center: gpu.f32.x2,
            color: gpu.f32.x2,
            scale: gpu.f32,
            intensity: gpu.f32,
            xray: gpu.u32,
            crosshairs: gpu.u32
        });
        this.uniforms = device.syncBuffer({
            label: "uniforms",
            usage: ["UNIFORM"],
            data: this.uniformsStruct.view([{
                    center: center,
                    color: [5 / 4, Math.sqrt(2) / 2],
                    scale: scale,
                    intensity: 0.5,
                    xray: 0,
                    crosshairs: 1,
                }])
        });
        this.gpuCanvas = new gpu.Canvas(device, canvasId, 1);
        this.pipeline = device.wrapped.createRenderPipeline({
            vertex: vertexShader.vertexState("v_main", []),
            fragment: fragmentShader.fragmentState("f_main", [this.gpuCanvas]),
            primitive: {
                stripIndexFormat: "uint16",
                topology: "triangle-strip"
            },
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
            layout: "auto"
        });
        this.paramsGroup = device.wrapped.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                    binding: 0,
                    resource: this.uniforms.asBindingResource()
                }]
        });
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
        this.device.enqueueCommands("render", encoder => {
            const passDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r: 0, g: 0, b: 0, a: 1 })]
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, this.paramsGroup);
                pass.draw(3);
            });
        });
    }
}
export async function viewGPU(canvasId, center, scale) {
    const device = await gpu.Device.instance();
    const code = await gear.fetchTextFile("/shaders/mandelbrot.wgsl");
    const shaderModule = await device.shaderModule({
        code: gpu.renderingShaders.fullScreenPass(code),
        label: "mandelbrot"
    });
    return new ViewGPU(device, canvasId, shaderModule, shaderModule, center, scale);
}
export async function viewGL(canvasId, center, scale) {
    const canvas = document.getElementById(canvasId);
    const device = await gpu.Device.instance({}, glWebGPU(canvas));
    const code = await gear.fetchTextFile("/shaders/mandelbrot.frag");
    const vertexShaderModule = await device.shaderModule({
        code: wgl.vertexShaders.fullScreenPass,
        label: "mandelbrot"
    });
    const fragmentShaderModule = await device.shaderModule({
        code: wgl.fragmentShaders.fullScreenPass(code),
        label: "mandelbrot"
    });
    return new ViewGPU(device, canvasId, vertexShaderModule, fragmentShaderModule, center, scale);
}
//# sourceMappingURL=view.gpu.js.map