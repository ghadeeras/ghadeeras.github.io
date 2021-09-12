var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gear from "../../gear/latest/files.js";
import * as ether from "../../ether/latest/index.js";
import * as v from "./view.js";
export class GPUView {
    constructor(device, adapter, canvasId, shaderCode) {
        var _a;
        this.device = device;
        this.uniformsData = new Float32Array([
            ...ether.mat4.columnMajorArray(ether.mat4.identity()),
            ...ether.mat4.columnMajorArray(ether.mat4.identity()),
            ...ether.mat4.columnMajorArray(ether.mat4.identity()),
            1, 1, 1, 1,
            2, 2, 2, 1,
            0,
            0.1,
            0
        ]);
        this._frame = null;
        this._next = null;
        this._nextCount = 0;
        this._matPositions = ether.mat4.identity();
        this._matNormals = ether.mat4.identity();
        this._matView = ether.mat4.identity();
        this._globalLightPosition = [2, 2, 2, 1];
        this._verticesCount = 0;
        this.uniforms = GPUView.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsData);
        this.vertices = GPUView.createBuffer(device, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array([]));
        const canvas = document.getElementById(canvasId);
        this.context = v.required((_a = canvas.getContext("webgpu")) !== null && _a !== void 0 ? _a : canvas.getContext("gpupresent"));
        const colorFormat = this.context.getPreferredFormat(adapter);
        const pixelRatio = window.devicePixelRatio || 1;
        const sampleCount = Math.pow(Math.ceil(pixelRatio), 2);
        const size = {
            width: canvas.clientWidth * pixelRatio,
            height: canvas.clientHeight * pixelRatio
        };
        this.context.configure({
            device: device,
            format: colorFormat,
            size: size,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        const colorTexture = device.createTexture({
            format: colorFormat,
            size: size,
            sampleCount: sampleCount,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.colorView = colorTexture.createView();
        const depthTexture = device.createTexture({
            format: "depth24plus",
            size: size,
            sampleCount: sampleCount,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.depthView = depthTexture.createView();
        const shaderModule = device.createShaderModule({ code: shaderCode });
        this.pipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "v_main",
                buffers: [{
                        arrayStride: 6 * 4,
                        attributes: [{
                                shaderLocation: 0,
                                format: "float32x3",
                                offset: 0
                            }, {
                                shaderLocation: 1,
                                format: "float32x3",
                                offset: 12
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
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            },
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: sampleCount
            }
        });
        this.uniformsGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                    resource: { buffer: this.uniforms },
                    binding: 0
                }]
        });
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
    get matPositions() {
        return this._matPositions;
    }
    get matNormals() {
        return this._matNormals;
    }
    get matView() {
        return this._matView;
    }
    set matView(m) {
        this._matView = m;
        this.lightPosition = this._globalLightPosition;
    }
    setMatModel(modelPositions, modelNormals = ether.mat4.transpose(ether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions;
        this._matNormals = modelNormals;
        const matPositions = ether.mat4.columnMajorArray(ether.mat4.mul(this.matView, modelPositions));
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            ether.mat4.columnMajorArray(ether.mat4.mul(this.matView, modelNormals));
        this.uniformsData.set(matPositions, 0);
        this.uniformsData.set(matNormals, 16);
        this.device.queue.writeBuffer(this.uniforms, 0, this.uniformsData, 0, 32);
    }
    get matProjection() {
        return v.asMat(this.uniformsData, 32);
    }
    set matProjection(m) {
        this.uniformsData.set(ether.mat4.columnMajorArray(m), 32);
        this.device.queue.writeBuffer(this.uniforms, 32 * 4, this.uniformsData, 32, 16);
    }
    get color() {
        return v.asVec(this.uniformsData, 48);
    }
    set color(c) {
        this.uniformsData.set(c, 48);
        this.device.queue.writeBuffer(this.uniforms, 48 * 4, this.uniformsData, 48, 4);
    }
    get lightPosition() {
        return this._globalLightPosition;
    }
    set lightPosition(p) {
        this._globalLightPosition = p;
        const vp = ether.mat4.apply(this._matView, p);
        this.uniformsData.set(vp, 52);
        this.device.queue.writeBuffer(this.uniforms, 52 * 4, this.uniformsData, 52, 4);
    }
    get shininess() {
        return this.uniformsData[56];
    }
    set shininess(s) {
        this.uniformsData[56] = s;
        this.device.queue.writeBuffer(this.uniforms, 56 * 4, this.uniformsData, 56, 1);
    }
    get lightRadius() {
        return this.uniformsData[57];
    }
    set lightRadius(s) {
        this.uniformsData[57] = s;
        this.device.queue.writeBuffer(this.uniforms, 57 * 4, this.uniformsData, 57, 1);
    }
    get fogginess() {
        return this.uniformsData[58];
    }
    set fogginess(f) {
        this.uniformsData[58] = f;
        this.device.queue.writeBuffer(this.uniforms, 58 * 4, this.uniformsData, 58, 1);
    }
    setMesh(primitives, vertices) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._next) {
                this._next.destroy();
            }
            this._next = GPUView.createBuffer(this.device, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, vertices);
            this._nextCount = vertices.length / 6;
            if (!this._frame) {
                this._frame = () => {
                    this.draw();
                    if (this._frame) {
                        requestAnimationFrame(this._frame);
                    }
                };
                this._frame();
            }
        });
    }
    draw() {
        if (this._next) {
            this.vertices.destroy();
            this.vertices = this._next;
            this._next = null;
            this._verticesCount = this._nextCount;
        }
        const encoder = this.device.createCommandEncoder();
        const passDescription = {
            colorAttachments: [{
                    view: this.colorView,
                    resolveTarget: this.context.getCurrentTexture().createView(),
                    loadValue: { r: 1, g: 1, b: 1, a: 1 },
                    storeOp: "discard"
                }],
            depthStencilAttachment: {
                depthLoadValue: 1,
                depthStoreOp: "discard",
                stencilLoadValue: "load",
                stencilStoreOp: "discard",
                view: this.depthView
            }
        };
        const pass = encoder.beginRenderPass(passDescription);
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.vertices);
        pass.setBindGroup(0, this.uniformsGroup);
        pass.draw(this._verticesCount);
        pass.endPass();
        this.device.queue.submit([encoder.finish()]);
    }
}
export function newView(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield gear.fetchTextFiles({
            shader: "generic.wgsl"
        }, "/shaders");
        const gpu = v.required(navigator.gpu);
        const adapter = v.required(yield gpu.requestAdapter());
        const device = v.required(yield adapter.requestDevice());
        return new GPUView(device, adapter, canvasId, shaders.shader);
    });
}
//# sourceMappingURL=view.gpu.js.map