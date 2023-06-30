import { aether } from "/gen/libs.js";
import { gltf, gpu } from "../djee/index.js"

const uniformsStruct = gpu.struct({
    mat: gpu.struct({
        positions: gpu.mat4x4,
        normals: gpu.mat4x4,
    }),
    projectionMat: gpu.mat4x4,
})

const projection = new aether.PerspectiveProjection(1, null, false, false)

export class NormalsRenderer {

    private device: gpu.Device
    
    readonly uniforms: gpu.SyncBuffer
    private uniformsGroup: GPUBindGroup

    private pipelineLayout: GPUPipelineLayout

    private fragmentState: GPUFragmentState
    private depthState: GPUDepthStencilState

    private rendererFactory: gpu.GPURendererFactory
    private renderer: ReturnType<gpu.GPURendererFactory["newInstance"]> | null = null

    private _viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
    private _modelMatrix = aether.mat4.identity()

    constructor(
        private shaderModule: gpu.ShaderModule,
        private depthTexture: gpu.Texture,
    ) {
        this.device = shaderModule.device;
        this.uniforms = this.device.syncBuffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, uniformsStruct.paddedSize);
        const uniformsGroupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                },
            }],
        })
        this.uniformsGroup = this.device.bindGroup(uniformsGroupLayout, [this.uniforms]);

        this.rendererFactory = new gpu.GPURendererFactory(
            this.device,
            1,
            { POSITION: 0, NORMAL: 1 },
            (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState)
        )
        
        this.pipelineLayout = this.device.device.createPipelineLayout({
            bindGroupLayouts: [uniformsGroupLayout, this.rendererFactory.matricesGroupLayout]
        });

        this.fragmentState = this.shaderModule.fragmentState("f_main", ["rgba32float"])
        this.depthState = this.depthTexture.depthState()
    }

    get aspectRatio() {
        const m = this.projectionMatrix
        const [sx, sy] = [m[0][0], m[1][1]];
        return sx === sy ? 1 : sy / sx
    }

    get focalLength() {
        const m = this.projectionMatrix
        const fl = Math.max(m[0][0], m[1][1]);
        return fl > 0 ? fl : 2
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
        this.renderer = this.rendererFactory.newInstance(model);
    }

    private primitivePipeline(vertexLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState): GPURenderPipeline {
        return this.device.device.createRenderPipeline({
            layout: this.pipelineLayout,
            fragment: this.fragmentState,
            depthStencil: this.depthState,
            vertex: this.shaderModule.vertexState("v_main", vertexLayouts),
            primitive: primitiveState,
        });
    }

    resize(width: number, height: number): void {
        this.depthTexture.resize({ width, height })
        this.projectionMatrix = projection.matrix(this.focalLength, width / height)
    }

    render(encoder: gpu.CommandEncoder, attachment: GPURenderPassColorAttachment) {
        const passDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [attachment],
            depthStencilAttachment: this.depthTexture.createView().depthAttachment()
        };
        encoder.renderPass(passDescriptor, pass => {
            if (this.renderer !== null) {
                pass.setBindGroup(0, this.uniformsGroup);
                this.renderer.render(pass);
            }
        });
    }

}