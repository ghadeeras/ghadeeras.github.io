import * as aether from "aether"
import { gpu } from "lumen";
import { gltf, gltf_gpu } from "../djee/index.js"
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

export class GPUView implements View {

    private gpuCanvas: gpu.Canvas
    private depthTexture: gpu.Texture

    private uniforms: gpu.SyncBuffer
    private uniformsGroupLayout: GPUBindGroupLayout
    private uniformsGroup: GPUBindGroup

    private pipelineLayout: GPUPipelineLayout

    private fragmentState: GPUFragmentState
    private depthState: GPUDepthStencilState

    private rendererFactory: gltf_gpu.GPURendererFactory
    private renderer: ReturnType<gltf_gpu.GPURendererFactory["newInstance"]> | null = null

    private _viewMatrix = aether.mat4.identity()
    private _modelMatrix = aether.mat4.identity()

    private perspective: gltf.graph.Perspective = gltf.graph.defaultPerspective()

    constructor(
        private device: gpu.Device,
        private shaderModule: gpu.ShaderModule,
        canvasId: string,
    ) {
 
        this.gpuCanvas = device.canvas(canvasId, 4)
        this.depthTexture = this.gpuCanvas.depthTexture()

        this.uniforms = device.syncBuffer({
            label: "uniforms",
            usage: ["UNIFORM"], 
            size: uniformsStruct.paddedSize
        });
        this.uniformsGroupLayout = device.wrapped.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                },
            }],
        })
        this.uniformsGroup = device.wrapped.createBindGroup({
            layout: this.uniformsGroupLayout,
            entries: [{
                binding: 0,
                resource: this.uniforms.gpuBuffer.wrapped
            }]
        });

        this.rendererFactory = new gltf_gpu.GPURendererFactory(
            this.device,
            1,
            { POSITION: 0, NORMAL: 1 },
            (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState)
        )

        this.pipelineLayout = this.device.wrapped.createPipelineLayout({
            bindGroupLayouts: [this.uniformsGroupLayout, this.rendererFactory.matricesGroupLayout],
        });

        this.fragmentState = this.shaderModule.fragmentState("f_main", [this.gpuCanvas])
        this.depthState = this.depthTexture.depthState({ depthCompare: "greater" })    
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

    async loadModel(modelUri: string): Promise<gltf.graph.Model> {
        const model = await gltf.graph.Model.create(modelUri);
        this.perspective = model.scene.perspectives[0]
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio)
        this._viewMatrix = this.perspective.matrix
        this._modelMatrix = this.perspective.modelMatrix
        this.resetModelViewMatrix()
        if (this.renderer !== null) {
            this.renderer.destroy();
            this.renderer = null;
        }
        this.renderer = this.rendererFactory.newInstance(model);
        return model
    }

    private primitivePipeline(vertexLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState): GPURenderPipeline {
        const attributesCount = vertexLayouts.map(layout => [...layout.attributes].length).reduce((l1, l2) => l1 + l2, 0);
        return this.device.wrapped.createRenderPipeline({
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

    resize() {
        this.gpuCanvas.resize();
        this.depthTexture.size = this.gpuCanvas.size;
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio, this.focalLength)
    }

    draw() {
        this.device.enqueueCommands("render", encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.gpuCanvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment(0)
            };
            encoder.renderPass(passDescriptor, pass => {
                if (this.renderer !== null) {
                    pass.setBindGroup(0, this.uniformsGroup)
                    this.renderer.render(pass)
                }
            })
        })
    }

    get xrContext(): WebGL2RenderingContext | null {
        return null
    }

}

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const gpuParam = new URL(location.href).searchParams.get("gpu")
    if (gpuParam && gpuParam?.toUpperCase() == 'N') {
        throw new Error("Unsupported by choice")
    }
    const device = await gpu.Device.instance()
    const shaderModule = await device.shaderModule({ path: "shaders/gltf.wgsl" })
    return () => new GPUView(device, shaderModule, canvasId)
}
