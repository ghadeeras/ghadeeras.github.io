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
import * as ether from "../../ether/latest/index.js";
import { picker } from "./picker.gpu.js";
export class GPUView {
    constructor(device, canvasId, shaderModule) {
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
        this.uniforms = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, this.uniformsData);
        this.vertices = device.buffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, 6 * 4, new Float32Array([]));
        this.canvas = device.canvas(canvasId);
        this.depthTexture = this.canvas.depthTexture();
        this.pipeline = device.device.createRenderPipeline({
            vertex: {
                module: shaderModule.shaderModule,
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
            fragment: shaderModule.fragmentState("f_main", [this.canvas]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: this.canvas.sampleCount
            }
        });
        this.uniformsGroup = device.createBindGroup(this.pipeline.getBindGroupLayout(0), [this.uniforms]);
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
        this.uniforms.writeAt(0, this.uniformsData, 0, 32);
    }
    get matProjection() {
        return ether.mat4.from(this.uniformsData, 32);
    }
    set matProjection(m) {
        this.uniformsData.set(ether.mat4.columnMajorArray(m), 32);
        this.uniforms.writeAt(32 * 4, this.uniformsData, 32, 16);
    }
    get color() {
        return ether.vec4.from(this.uniformsData, 48);
    }
    set color(c) {
        this.uniformsData.set(c, 48);
        this.uniforms.writeAt(48 * 4, this.uniformsData, 48, 4);
    }
    get lightPosition() {
        return this._lightPosition;
    }
    set lightPosition(p) {
        this._lightPosition = p;
        this.uniformsData.set(ether.vec4.add(this._matView[3], p), 52);
        this.uniforms.writeAt(52 * 4, this.uniformsData, 52, 4);
    }
    get shininess() {
        return this.uniformsData[56];
    }
    set shininess(s) {
        this.uniformsData[56] = s;
        this.uniforms.writeAt(56 * 4, this.uniformsData, 56, 1);
    }
    get lightRadius() {
        return this.uniformsData[57];
    }
    set lightRadius(s) {
        this.uniformsData[57] = s;
        this.uniforms.writeAt(57 * 4, this.uniformsData, 57, 1);
    }
    get fogginess() {
        return this.uniformsData[58];
    }
    set fogginess(f) {
        this.uniformsData[58] = f;
        this.uniforms.writeAt(58 * 4, this.uniformsData, 58, 1);
    }
    setMesh(primitives, vertices) {
        this.vertices.setData(vertices);
    }
    picker() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield picker(this.canvas, () => this.vertices);
        });
    }
    draw() {
        this.device.enqueueCommand(encoder => {
            const passDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setVertexBuffer(0, this.vertices.buffer);
                pass.setBindGroup(0, this.uniformsGroup);
                pass.draw(this.vertices.stridesCount);
            });
        });
    }
}
export function newView(canvasId) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpu.Device.instance();
        const shaderModule = yield device.loadShaderModule("generic.wgsl");
        return new GPUView(device, canvasId, shaderModule);
    });
}
//# sourceMappingURL=view.gpu.js.map