import * as aether from "aether";
import { gpu } from "lumen";
import { picker } from "./picker.gpu.js";
const projection = new aether.PerspectiveProjection(1, null, false, false);
export class GPUView {
    constructor(device, canvasId, shaderModule) {
        this.device = device;
        this.uniformsStruct = gpu.struct({
            mat: gpu.struct({
                positions: gpu.mat4x4,
                normals: gpu.mat4x4,
            }),
            projectionMat: gpu.mat4x4,
            color: gpu.f32.x4,
            lightPos: gpu.f32.x4,
            shininess: gpu.f32,
            lightRadius: gpu.f32,
            fogginess: gpu.f32,
        });
        this._matPositions = aether.mat4.identity();
        this._matNormals = aether.mat4.identity();
        this._matView = aether.mat4.identity();
        this._lightPosition = [2, 2, 2, 1];
        this._focalLength = 2;
        this._aspectRatio = 1;
        this.uniforms = device.syncBuffer("uniforms", {
            usage: ["UNIFORM"],
            size: this.uniformsStruct.paddedSize
        });
        this.vertices = device.dataBuffer("vertices", {
            usage: ["VERTEX"],
            size: GPUView.vertex.struct.stride
        });
        this.gpuCanvas = device.canvas(canvasId, 4);
        this.depthTexture = this.gpuCanvas.depthTexture();
        this.pipeline = device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", [GPUView.vertex.asBufferLayout()]),
            fragment: shaderModule.fragmentState("f_main", [this.gpuCanvas]),
            depthStencil: this.depthTexture.depthState(),
            primitive: {
                topology: "triangle-list"
            },
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
            layout: "auto"
        });
        this.uniformsGroup = device.wrapped.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                    binding: 0,
                    resource: this.uniforms.asBindingResource()
                }]
        });
    }
    async picker() {
        return await picker(this.gpuCanvas, () => this.vertices);
    }
    resize() {
        this._aspectRatio = this.gpuCanvas.element.width / this.gpuCanvas.element.height;
        this.matProjection = projection.matrix(this._focalLength, this._aspectRatio);
        this.gpuCanvas.resize();
        this.depthTexture.resize(this.gpuCanvas.size);
    }
    render() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setVertexBuffer(0, this.vertices.wrapped);
                pass.setBindGroup(0, this.uniformsGroup);
                pass.draw(this.vertices.size / GPUView.vertex.struct.stride);
            });
        });
    }
    setMatModel(modelPositions, modelNormals = aether.mat4.transpose(aether.mat4.inverse(modelPositions))) {
        this._matPositions = modelPositions;
        this._matNormals = modelNormals;
        const matPositions = aether.mat4.mul(this.matView, modelPositions);
        const matNormals = modelPositions === modelNormals ?
            matPositions :
            aether.mat4.mul(this.matView, modelNormals);
        this.uniforms.set(this.uniformsStruct.members.mat, {
            positions: matPositions,
            normals: matNormals
        });
    }
    setMesh(_primitives, vertices) {
        this.vertices.setData(gpu.dataView(vertices));
    }
    get canvas() {
        return this.gpuCanvas.element;
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
    get focalLength() {
        return this._focalLength;
    }
    set focalLength(l) {
        this._focalLength = l;
        this.matProjection = projection.matrix(this._focalLength, this._aspectRatio);
    }
    get matProjection() {
        return this.uniforms.get(this.uniformsStruct.members.projectionMat);
    }
    set matProjection(m) {
        this.uniforms.set(this.uniformsStruct.members.projectionMat, m);
    }
    get color() {
        return this.uniforms.get(this.uniformsStruct.members.color);
    }
    set color(c) {
        this.uniforms.set(this.uniformsStruct.members.color, c);
    }
    get lightPosition() {
        return this._lightPosition;
    }
    set lightPosition(p) {
        this._lightPosition = p;
        this.uniforms.set(this.uniformsStruct.members.lightPos, aether.vec4.add(this._matView[3], p));
    }
    get shininess() {
        return this.uniforms.get(this.uniformsStruct.members.shininess);
    }
    set shininess(s) {
        this.uniforms.set(this.uniformsStruct.members.shininess, s);
    }
    get lightRadius() {
        return this.uniforms.get(this.uniformsStruct.members.lightRadius);
    }
    set lightRadius(r) {
        this.uniforms.set(this.uniformsStruct.members.lightRadius, r);
    }
    get fogginess() {
        return this.uniforms.get(this.uniformsStruct.members.fogginess);
    }
    set fogginess(f) {
        this.uniforms.set(this.uniformsStruct.members.fogginess, f);
    }
}
GPUView.vertex = gpu.vertex({
    position: gpu.f32.x3,
    normal: gpu.f32.x3,
});
export async function newView(canvasId) {
    const device = await gpu.Device.instance();
    const shaderModule = await device.loadShaderModule("generic.wgsl");
    return new GPUView(device, canvasId, shaderModule);
}
//# sourceMappingURL=view.gpu.js.map