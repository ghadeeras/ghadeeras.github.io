import { aether } from "/gen/libs.js";
import { gltf, gpu } from "../djee/index.js"
import { View, ViewFactory } from "./view.js";

export type ModelIndexEntry = {
    name: string,
    screenshot: string,
    variants: {
      glTF: string,
      "glTF-Binary": string,
      "glTF-Draco": string,
      "glTF-Embedded": string
    }
}

const uniformsStruct = gpu.struct({
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
})

const projection = new aether.PerspectiveProjection(1, null, false, false)

export class GPUView implements View {

    private gpuCanvas: gpu.Canvas
    private depthTexture: gpu.Texture

    private uniforms: gpu.SyncBuffer
    private uniformsGroupLayout: GPUBindGroupLayout
    private uniformsGroup: GPUBindGroup

    private nodeGroupLayout: GPUBindGroupLayout
    private pipelineLayout: GPUPipelineLayout

    private fragmentState: GPUFragmentState
    private depthState: GPUDepthStencilState

    private renderer: gpu.GPURenderer | null = null

    private _viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
    private _modelMatrix = aether.mat4.identity()

    constructor(
        private device: gpu.Device,
        private shaderModule: gpu.ShaderModule,
        canvasId: string,
    ) {
 
        this.gpuCanvas = device.canvas(canvasId, 4)
        this.depthTexture = this.gpuCanvas.depthTexture()

        this.uniforms = device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, uniformsStruct.paddedSize);
        this.uniformsGroupLayout = device.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                },
            }],
        })
        this.uniformsGroup = device.bindGroup(this.uniformsGroupLayout, [this.uniforms]);
        
        this.nodeGroupLayout = device.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                },
            }],
        })

        this.pipelineLayout = this.device.device.createPipelineLayout({
            bindGroupLayouts: [this.uniformsGroupLayout, this.nodeGroupLayout],
        });

        this.fragmentState = this.shaderModule.fragmentState("f_main", [this.gpuCanvas])
        this.depthState = this.depthTexture.depthState()    
    }

    get aspectRatio(): number {
        return this.gpuCanvas.element.width / this.gpuCanvas.element.height;
    }

    get focalLength() {
        const m = this.projectionMatrix
        const fl = Math.max(m[0][0], m[1][1]);
        return fl > 0 ? fl : 2
    }

    get canvas(): HTMLCanvasElement {
        return this.gpuCanvas.element
    }

    set modelColor(color: [number, number, number, number]) {
        this.uniforms.set(uniformsStruct.members.color, color)
    }

    set lightPosition(p: [number, number, number]) {
        this.uniforms.set(uniformsStruct.members.lightPos, [...p, 1])
    }

    set lightRadius(r: number) {
        this.uniforms.set(uniformsStruct.members.lightRadius, r)
    }
    
    set shininess(s: number) {
        this.uniforms.set(uniformsStruct.members.shininess, s)
    }

    set fogginess(f: number) {
        this.uniforms.set(uniformsStruct.members.fogginess, f)
    }

    get projectionMatrix() {
        return this.uniforms.get(uniformsStruct.members.projectionMat)
    }

    set projectionMatrix(m: aether.Mat4) {
        this.uniforms.set(uniformsStruct.members.projectionMat, m)
    }

    get viewMatrix() {
        return this._viewMatrix
    }

    set viewMatrix(m: aether.Mat4) {
        this._viewMatrix = m
        this.resetModelViewMatrix();
    }

    get modelMatrix() {
        return this._modelMatrix
    }

    set modelMatrix(m: aether.Mat4) {
        this._modelMatrix = m
        this.resetModelViewMatrix();
    }

    private resetModelViewMatrix() {
        const mvMat = aether.mat4.mul(this._viewMatrix, this._modelMatrix);
        this.uniforms.set(uniformsStruct.members.mat, { normals: mvMat, positions: mvMat });
    }

    async loadModel(modelUri: string) {
        this._modelMatrix = aether.mat4.identity()
        this._viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
        const modelView = aether.mat4.mul(this._viewMatrix, this._modelMatrix);
        this.uniforms.set(uniformsStruct.members.mat, { positions: modelView, normals: modelView })
        this.projectionMatrix =  projection.matrix(2, this.aspectRatio)
        const model = await gltf.graph.Model.create(modelUri);
        if (this.renderer !== null) {
            this.renderer.destroy();
            this.renderer = null;
        }
        this.renderer = new gpu.GPURenderer(
            model,
            this.device,
            1,
            { POSITION: 0, NORMAL: 1 },
            (buffer, offset) => this.nodeBindGroup(buffer, offset),
            (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState)
        );
    }

    private primitivePipeline(vertexLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState): GPURenderPipeline {
        const attributesCount = vertexLayouts.map(layout => [...layout.attributes].length).reduce((l1, l2) => l1 + l2, 0);
        return this.device.device.createRenderPipeline({
            layout: this.pipelineLayout,
            fragment: this.fragmentState,
            depthStencil: this.depthState,
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
            vertex: this.shaderModule.vertexState(attributesCount == 2 ? "v_main" : "v_main_no_normals", vertexLayouts),
            primitive: primitiveState,
        });
    }

    private nodeBindGroup(buffer: gpu.Buffer, offset: number): GPUBindGroup {
        return this.device.device.createBindGroup({
            layout: this.nodeGroupLayout,
            entries: [{
                binding: 0,
                resource: {
                    buffer: buffer.buffer,
                    offset,
                    size: uniformsStruct.members.mat.paddedSize
                }
            }]
        });
    }

    resize() {
        this.gpuCanvas.resize();
        this.depthTexture.resize(this.gpuCanvas.size);
        this.projectionMatrix = projection.matrix(this.focalLength, this.aspectRatio)
    }

    draw() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment()
            };
            encoder.renderPass(passDescriptor, pass => {
                if (this.renderer !== null) {
                    pass.setBindGroup(0, this.uniformsGroup)
                    this.renderer.render(pass)
                }
            })
        })
    }

}

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const device = await gpu.Device.instance()
    const shaderModule = await device.loadShaderModule("gltf.wgsl")
    return () => new GPUView(device, shaderModule, canvasId)
}
