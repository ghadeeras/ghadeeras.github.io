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

const vertex = gpu.vertex({
    position: gpu.f32.x3,
    normal: gpu.f32.x3,
})

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

    private canvas: gpu.Canvas
    private depthTexture: gpu.Texture
    private uniforms: gpu.Buffer
    private uniformsGroup: GPUBindGroup
    private renderer: gpu.GPURenderer | null = null

    private uniformsView: DataView = uniformsStruct.view()

    private viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
    private modelMatrix = aether.mat4.identity()
    private projectionMatrix = aether.mat4.projection(2);

    constructor(
        private device: gpu.Device,
        canvasId: string,
        shaderModule: gpu.ShaderModule,
        inputs: ViewInputs,
    ) {
        this.uniforms = device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, this.uniformsView);
 
        this.canvas = device.canvas(canvasId)
        this.depthTexture = this.canvas.depthTexture()

        const nodeGroupLayout = device.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                },
            }],
        })
        const uniformsGroupLayout = device.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                },
            }],
        })
        this.uniformsGroup = device.createBindGroup(uniformsGroupLayout, [this.uniforms]);
        
        inputs.lightPosition.map(p => aether.vec4.from([...p, 1])).attach(this.setter(uniformsStruct.members.lightPos))
        inputs.lightRadius.attach(this.setter(uniformsStruct.members.lightRadius))
        inputs.color.attach(this.setter(uniformsStruct.members.color))
        inputs.shininess.attach(this.setter(uniformsStruct.members.shininess))
        inputs.fogginess.attach(this.setter(uniformsStruct.members.fogginess))
        
        gear.Value.from(
            inputs.matModel.map(m => aether.mat4.mul(this.viewMatrix, this.modelMatrix = m)),
            inputs.matView.map(m => aether.mat4.mul(this.viewMatrix = m, this.modelMatrix))
        ).map(m => ({
            positions: m,
            normals: m,
        })).attach(this.setter(uniformsStruct.members.mat))
        this.setter(uniformsStruct.members.projectionMat)(this.projectionMatrix)

        inputs.modelUri.attach(async (modelUri) => {
            if (this.renderer !== null) {
                this.renderer.destroy()
                this.renderer = null
            }
            this.renderer = null
            this.renderer = new gpu.GPURenderer(
                await gltf.graph.Model.create(modelUri),
                this.device,
                1,
                { POSITION: 0, NORMAL: 1 },
                (buffer, offset) => this.nodeBindGroup(nodeGroupLayout, buffer, offset),
                (layouts, primitiveState) => this.primitivePipeline(shaderModule, [uniformsGroupLayout, nodeGroupLayout], layouts, primitiveState)
            )
        })

    }

    private primitivePipeline(shaderModule: gpu.ShaderModule, bindLayouts: GPUBindGroupLayout[], vertexLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState): GPURenderPipeline {
        return this.device.device.createRenderPipeline({
            layout: this.device.device.createPipelineLayout({
                bindGroupLayouts: bindLayouts
            }),
            vertex: shaderModule.vertexState("v_main", vertexLayouts),
            fragment: shaderModule.fragmentState("f_main", [this.canvas]),
            depthStencil: this.depthTexture.depthState(),
            primitive: primitiveState,
            multisample: {
                count: this.canvas.sampleCount
            }
        });
    }

    private nodeBindGroup(nodeGroupLayout: GPUBindGroupLayout, buffer: gpu.Buffer, offset: number): GPUBindGroup {
        return this.device.device.createBindGroup({
            layout: nodeGroupLayout,
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
        return (value: T) => {
            member.write(this.uniformsView, value)
            this.uniforms.syncFrom(this.uniformsView, member)
        }
    }

    draw() {
        this.device.enqueueCommand(encoder => {
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.depthAttachment()
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
    return inputs => new GPUView(device, canvasId, shaderModule, inputs)
}
