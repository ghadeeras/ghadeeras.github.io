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
import { DeferredComputation } from '../../gear/latest/scheduling.js';
import * as gputils from '../djee/gpu/utils.js';
import * as geo from './geo.js';
export class Renderer {
    constructor(device, renderShader, canvas) {
        var _a;
        this.device = device;
        this._projectionMatrix = ether.mat4.projection(1);
        this._viewMatrix = ether.mat4.lookAt([0, 0, -24]);
        this._modelMatrix = ether.mat4.identity();
        this.renderingUniformsData = [
            // mpvMatrix: mat4x4<f32>;
            ...this.mvpMatrix(),
            // radiusScale: f32;
            0.05,
        ];
        this.updateRenderingUniformsData = new DeferredComputation(() => {
            this.device.queue.writeBuffer(this.renderingUniformsBuffer, 0, new Float32Array(this.renderingUniformsData));
        });
        const mesh = geo.sphere(18, 9);
        this.meshIndexFormat = (_a = mesh.indexFormat) !== null && _a !== void 0 ? _a : "uint16";
        this.meshSize = mesh.indices.length;
        /* Pipeline */
        this.renderPipeline = this.createPipeline(device, renderShader, canvas.format, mesh, canvas.sampleCount);
        const renderBindGroupLayout = this.renderPipeline.getBindGroupLayout(0);
        /* Buffers */
        this.renderingUniformsBuffer = gputils.createBuffer(device, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, new Float32Array(this.renderingUniformsData));
        this.meshIndicesBuffer = gputils.createBuffer(device, GPUBufferUsage.INDEX, new Uint16Array(mesh.indices));
        this.meshVertexBuffer = gputils.createBuffer(device, GPUBufferUsage.VERTEX, new Float32Array(mesh.positions));
        /* Bind Groups */
        this.renderBindGroup = gputils.createBindGroup(this.device, renderBindGroupLayout, [this.renderingUniformsBuffer]);
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
                module: shaderModule,
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
            fragment: {
                entryPoint: "f_main",
                module: shaderModule,
                targets: [
                    {
                        format: colorFormat
                    }
                ],
            },
            depthStencil: {
                format: "depth32float",
                depthCompare: 'less',
                depthWriteEnabled: true,
            },
            primitive: {
                topology: mesh.topology,
                stripIndexFormat: mesh.indexFormat,
            },
            multisample: {
                count: sampleCount
            }
        });
    }
    render(universe, descriptor) {
        this.device.queue.submit([
            gputils.encodeCommand(this.device, encoder => {
                gputils.renderPass(encoder, descriptor, pass => {
                    pass.setPipeline(this.renderPipeline);
                    pass.setBindGroup(0, this.renderBindGroup);
                    pass.setVertexBuffer(0, universe.bodyDescriptionsBuffer);
                    pass.setVertexBuffer(1, universe.currentState);
                    pass.setVertexBuffer(2, this.meshVertexBuffer);
                    pass.setIndexBuffer(this.meshIndicesBuffer, this.meshIndexFormat);
                    pass.drawIndexed(this.meshSize, universe.bodiesCount, 0, 0);
                });
            })
        ]);
    }
}
export function newRenderer(device, canvas) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaderModule = yield gputils.loadShaderModule(device, "gravity-render.wgsl");
        return new Renderer(device, shaderModule, canvas);
    });
}
//# sourceMappingURL=renderer.js.map