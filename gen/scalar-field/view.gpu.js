var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as ether from "../../ether/latest/index.js";
import * as etherX from "../utils/ether.js";
import * as gputils from "../djee/gpu/utils.js";
import { Canvas } from "../djee/gpu/canvas.js";
export class GPUView {
    constructor(device, adapter, canvasId, shaderModule) {
        this.device = device;
        this.uniformsData = new Float32Array([
            ...ether.mat4.columnMajorArray(ether.mat4.identity()),
            ...ether.mat4.columnMajorArray(ether.mat4.identity()),
            ...ether.mat4.columnMajorArray(ether.mat4.identity()),
            1, 1, 1, 1,
            2, 2, 2, 1,
            0,
            0.1,
            0,
            // padding
            0
        ]);
        this._matPositions = ether.mat4.identity();
        this._matNormals = ether.mat4.identity();
        this._matView = ether.mat4.identity();
        this._lightPosition = [2, 2, 2, 1];
        this.verticesCount = 0;
        this.maxVerticesCount = 0;
        this.uniforms = gputils.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsData);
        this.vertices = gputils.createBuffer(device, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array([]));
        this.canvas = new Canvas(canvasId, device, adapter);
        this.depthTexture = this.canvas.depthTexture();
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
                        format: this.canvas.format
                    }]
            },
            depthStencil: {
                format: "depth32float",
                depthWriteEnabled: true,
                depthCompare: "less"
            },
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: this.canvas.sampleCount
            }
        });
        this.uniformsGroup = gputils.createBindGroup(device, this.pipeline.getBindGroupLayout(0), [this.uniforms]);
        this.frame = () => {
            this.draw();
            requestAnimationFrame(this.frame);
        };
        this.frame();
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
        this.lightPosition = this._lightPosition;
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
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 32, 0);
    }
    get matProjection() {
        return etherX.asMat(this.uniformsData, 32);
    }
    set matProjection(m) {
        this.uniformsData.set(ether.mat4.columnMajorArray(m), 32);
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 16, 32);
    }
    get color() {
        return etherX.asVec(this.uniformsData, 48);
    }
    set color(c) {
        this.uniformsData.set(c, 48);
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 4, 48);
    }
    get lightPosition() {
        return this._lightPosition;
    }
    set lightPosition(p) {
        this._lightPosition = p;
        const vp = ether.mat4.apply(this._matView, p);
        this.uniformsData.set(vp, 52);
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 4, 52);
    }
    get shininess() {
        return this.uniformsData[56];
    }
    set shininess(s) {
        this.uniformsData[56] = s;
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 1, 56);
    }
    get lightRadius() {
        return this.uniformsData[57];
    }
    set lightRadius(s) {
        this.uniformsData[57] = s;
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 1, 57);
    }
    get fogginess() {
        return this.uniformsData[58];
    }
    set fogginess(f) {
        this.uniformsData[58] = f;
        gputils.writeToBuffer(this.device, this.uniforms, this.uniformsData, 1, 58);
    }
    setMesh(primitives, vertices) {
        this.verticesCount = vertices.length / 6;
        if (this.verticesCount > this.maxVerticesCount) {
            this.vertices.destroy();
            this.vertices = gputils.createBuffer(this.device, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, vertices);
            this.maxVerticesCount = this.verticesCount;
        }
        else {
            this.device.queue.writeBuffer(this.vertices, 0, vertices);
        }
    }
    draw() {
        const command = gputils.encodeCommand(this.device, encoder => {
            const passDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: gputils.depthAttachment(this.depthTexture)
            };
            gputils.renderPass(encoder, passDescriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setVertexBuffer(0, this.vertices);
                pass.setBindGroup(0, this.uniformsGroup);
                pass.draw(this.verticesCount);
            });
        });
        this.device.queue.submit([command]);
    }
}
export function newView(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [device, adapter] = yield gputils.gpuObjects();
        const shaderModule = yield gputils.loadShaderModule(device, "generic.wgsl");
        return new GPUView(device, adapter, canvasId, shaderModule);
    });
}
//# sourceMappingURL=view.gpu.js.map