export class ViewGPU {
    constructor(julia, device, adapter, canvasId, shaderCode, center, scale) {
        var _a;
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
        this.params = ViewGPU.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.paramsData);
        this.vertices = ViewGPU.createBuffer(device, GPUBufferUsage.VERTEX, new Float32Array([
            -1, +1,
            -1, -1,
            +1, +1,
            +1, -1
        ]));
        const canvas = document.getElementById(canvasId);
        this.context = required((_a = canvas.getContext("webgpu")) !== null && _a !== void 0 ? _a : canvas.getContext("gpupresent"));
        const colorFormat = this.context.getPreferredFormat(adapter);
        this.context.configure({
            device: device,
            format: colorFormat
        });
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
        });
        this.paramsGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                    resource: { buffer: this.params },
                    binding: 0
                }]
        });
        const frame = () => {
            this.draw();
            requestAnimationFrame(frame);
        };
        frame();
    }
    static createBuffer(device, usage, data) {
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
    get center() {
        return [this.paramsData[0], this.paramsData[1]];
    }
    set center(c) {
        this.paramsData.set(c, 0);
        this.device.queue.writeBuffer(this.params, 0 * 4, this.paramsData, 0, 2);
    }
    setColor(h, s) {
        this.paramsData.set([h, s], 2);
        this.device.queue.writeBuffer(this.params, 2 * 4, this.paramsData, 2, 2);
    }
    get hue() {
        return this.paramsData[2];
    }
    set hue(h) {
        this.paramsData[2] = h;
        this.device.queue.writeBuffer(this.params, 2 * 4, this.paramsData, 2, 1);
    }
    get saturation() {
        return this.paramsData[3];
    }
    set saturation(s) {
        this.paramsData[3] = s;
        this.device.queue.writeBuffer(this.params, 3 * 4, this.paramsData, 3, 1);
    }
    get juliaNumber() {
        return [this.paramsData[4], this.paramsData[5]];
    }
    set juliaNumber(j) {
        this.paramsData.set(j, 4);
        this.device.queue.writeBuffer(this.params, 4 * 4, this.paramsData, 4, 2);
    }
    get scale() {
        return this.paramsData[6];
    }
    set scale(s) {
        this.paramsData[6] = s;
        this.device.queue.writeBuffer(this.params, 6 * 4, this.paramsData, 6, 1);
    }
    get intensity() {
        return this.paramsData[7];
    }
    set intensity(i) {
        this.paramsData[7] = i;
        this.device.queue.writeBuffer(this.params, 7 * 4, this.paramsData, 7, 1);
    }
    get palette() {
        return this.paramsData[8];
    }
    set palette(p) {
        this.paramsData[8] = p;
        this.device.queue.writeBuffer(this.params, 8 * 4, this.paramsData, 8, 1);
    }
    draw() {
        const encoder = this.device.createCommandEncoder();
        const passDescription = {
            colorAttachments: [{
                    view: this.context.getCurrentTexture().createView(),
                    loadValue: { r: 0, g: 0, b: 0, a: 1 },
                    storeOp: "store"
                }]
        };
        const pass = encoder.beginRenderPass(passDescription);
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.vertices);
        pass.setBindGroup(0, this.paramsGroup);
        pass.draw(4);
        pass.endPass();
        this.device.queue.submit([encoder.finish()]);
    }
}
export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
//# sourceMappingURL=view.gpu.js.map