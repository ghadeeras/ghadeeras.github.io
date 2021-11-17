var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as ether from '../../ether/latest/index.js';
import * as geo from './geo.js';
import { DeferredComputation } from '../../gear/latest/scheduling.js';
export class Renderer {
    constructor(device, canvas, renderShader) {
        var _a;
        this.device = device;
        this.canvas = canvas;
        this._projectionMatrix = ether.mat4.projection(1);
        this._viewMatrix = ether.mat4.lookAt([0, 0, -24]);
        this._modelMatrix = ether.mat4.identity();
        this.renderingUniformsData = [
            // mpvMatrix: mat4x4<f32>;
            ...this.mvpMatrix(),
            // radiusScale: f32;
            0.05,
            // padding
            0,
            0,
            0,
        ];
        this.updateRenderingUniformsData = new DeferredComputation(() => {
            this.renderingUniformsBuffer.writeAt(0, new Float32Array(this.renderingUniformsData));
        });
        const mesh = geo.sphere(18, 9);
        this.meshIndexFormat = (_a = mesh.indexFormat) !== null && _a !== void 0 ? _a : "uint16";
        this.meshSize = mesh.indices.length;
        this.depthTexture = canvas.depthTexture();
        /* Pipeline */
        this.renderPipeline = this.createPipeline(device.device, renderShader, canvas, mesh, canvas.sampleCount);
        const renderBindGroupLayout = this.renderPipeline.getBindGroupLayout(0);
        /* Buffers */
        this.renderingUniformsBuffer = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 1, new Float32Array(this.renderingUniformsData));
        this.meshIndicesBuffer = device.buffer(GPUBufferUsage.INDEX, 1, new Uint16Array(mesh.indices));
        this.meshVertexBuffer = device.buffer(GPUBufferUsage.VERTEX, 1, new Float32Array(mesh.positions));
        /* Bind Groups */
        this.renderBindGroup = this.device.createBindGroup(renderBindGroupLayout, [this.renderingUniformsBuffer]);
    }
    get projectionViewMatrix() {
        return ether.mat4.mul(this.projectionMatrix, this.viewMatrix);
    }
    get projectionMatrix() {
        return this._projectionMatrix;
    }
    set projectionMatrix(m) {
        this._projectionMatrix = m;
        this.updateMvpMatrix();
    }
    get viewMatrix() {
        return this._viewMatrix;
    }
    set viewMatrix(m) {
        this._viewMatrix = m;
        this.updateMvpMatrix();
    }
    get modelMatrix() {
        return this._modelMatrix;
    }
    set modelMatrix(m) {
        this._modelMatrix = m;
        this.updateMvpMatrix();
    }
    get radiusScale() {
        return this.renderingUniformsData[16];
    }
    set radiusScale(v) {
        this.renderingUniformsData[16] = v;
        this.updateRenderingUniformsData.perform();
    }
    updateMvpMatrix() {
        this.renderingUniformsData.splice(0, 16, ...this.mvpMatrix());
        this.updateRenderingUniformsData.perform();
    }
    mvpMatrix() {
        return ether.mat4.columnMajorArray(ether.mat4.mul(ether.mat4.mul(this._projectionMatrix, this._viewMatrix), this._modelMatrix));
    }
    createPipeline(device, shaderModule, colorFormat, mesh, sampleCount) {
        return device.createRenderPipeline({
            vertex: {
                entryPoint: "v_main",
                module: shaderModule.shaderModule,
                buffers: [
                    {
                        arrayStride: 2 * 4,
                        attributes: [{
                                offset: 0,
                                format: 'float32x2',
                                shaderLocation: 0,
                            }],
                        stepMode: 'instance',
                    },
                    {
                        arrayStride: 8 * 4,
                        attributes: [{
                                offset: 0,
                                format: 'float32x3',
                                shaderLocation: 1,
                            }],
                        stepMode: 'instance',
                    },
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                                offset: 0,
                                format: 'float32x3',
                                shaderLocation: 2,
                            }],
                        stepMode: 'vertex',
                    }
                ]
            },
            fragment: shaderModule.fragmentState("f_main", [colorFormat]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: mesh.topology,
                stripIndexFormat: mesh.indexFormat,
            },
            multisample: {
                count: sampleCount
            }
        });
    }
    render(universe) {
        const descriptor = {
            colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
            depthStencilAttachment: this.depthTexture.depthAttachment()
        };
        this.device.enqueueCommand(encoder => {
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.renderPipeline);
                pass.setBindGroup(0, this.renderBindGroup);
                pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer.buffer);
                pass.setVertexBuffer(1, universe.currentState.buffer);
                pass.setVertexBuffer(2, this.meshVertexBuffer.buffer);
                pass.setIndexBuffer(this.meshIndicesBuffer.buffer, this.meshIndexFormat);
                pass.drawIndexed(this.meshSize, universe.bodiesCount, 0, 0);
            });
        });
    }
}
export function newRenderer(device, canvas) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaderModule = yield device.loadShaderModule("gravity-render.wgsl");
        return new Renderer(device, canvas, shaderModule);
    });
}
//# sourceMappingURL=renderer.js.map