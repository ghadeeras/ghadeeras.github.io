import { aether, gear } from "/gen/libs.js";
import { gltf, gpu } from "../djee/index.js"
import { View, ViewFactory, ViewInputs } from "./view.js";

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

    private canvas: gpu.Canvas
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
        inputs: ViewInputs,
    ) {
 
        this.canvas = device.canvas(canvasId, 4)
        this.depthTexture = this.canvas.depthTexture()

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

        this.fragmentState = this.shaderModule.fragmentState("f_main", [this.canvas]),
        this.depthState = this.depthTexture.depthState(),
    
        inputs.lightPosition.map(p => aether.vec4.from([...p, 1])).attach(this.setter(uniformsStruct.members.lightPos))
        inputs.lightRadius.attach(this.setter(uniformsStruct.members.lightRadius))
        inputs.color.attach(this.setter(uniformsStruct.members.color))
        inputs.shininess.attach(this.setter(uniformsStruct.members.shininess))
        inputs.fogginess.attach(this.setter(uniformsStruct.members.fogginess))
        
        gear.Value.from(
            inputs.matModel.map(m => aether.mat4.mul(this._viewMatrix, this._modelMatrix = m)),
            inputs.matView.map(m => aether.mat4.mul(this._viewMatrix = m, this._modelMatrix))
        ).map(m => ({
            positions: m,
            normals: m,
        })).attach(this.setter(uniformsStruct.members.mat))

        inputs.matProjection.attach(this.setter(uniformsStruct.members.projectionMat))

        inputs.modelUri.attach((modelUri) => this.loadModel(modelUri))
    }

    get aspectRatio(): number {
        return this.canvas.element.width / this.canvas.element.height;
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

    get modelMatrix() {
        return this._modelMatrix
    }

    private async loadModel(modelUri: string) {
        try {
            this.statusUpdater("Loading model ...");
            this._modelMatrix = aether.mat4.identity()
            this._viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
            const modelView = aether.mat4.mul(this._viewMatrix, this._modelMatrix);
            this.uniforms.set(uniformsStruct.members.mat, { positions: modelView, normals: modelView })
            this.projectionMatrix =  projection.matrix(2, this.aspectRatio)
            const model = await gltf.graph.Model.create(modelUri);
            this.statusUpdater("Parsing model ...");
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
            this.statusUpdater("Rendering model ...");
        } catch (e) {
            this.statusUpdater(`Error: ${e}`);
            console.error(e);
        }
    }

    private primitivePipeline(vertexLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState): GPURenderPipeline {
        const attributesCount = vertexLayouts.map(layout => [...layout.attributes].length).reduce((l1, l2) => l1 + l2, 0);
        return this.device.device.createRenderPipeline({
            layout: this.pipelineLayout,
            fragment: this.fragmentState,
            depthStencil: this.depthState,
            multisample: {
                count: this.canvas.sampleCount
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

    private setter<T>(member: gpu.Element<T>) {
        return (value: T) => this.uniforms.set(member, value)
    }

    resize() {
        this.canvas.resize();
        this.depthTexture.resize(this.canvas.size);
        this.projectionMatrix = projection.matrix(this.focalLength, this.aspectRatio)
    }

    draw() {
        this.device.enqueueCommand("render", encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
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

    private statusUpdater: gear.Consumer<string> = () => {}

    readonly status: gear.Value<string> = new gear.Value(consumer => this.statusUpdater = consumer)

}

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const device = await gpu.Device.instance()
    const shaderModule = await device.loadShaderModule("gltf.wgsl")
    return inputs => new GPUView(device, shaderModule, canvasId, inputs)
}
