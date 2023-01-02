import { aether, gear } from "/gen/libs.js";
import { gltf, gpu } from "../djee/index.js"
import { ViewInputs } from "./view.js";

const uniformsStruct = gpu.struct({
    mat: gpu.struct({
        positions: gpu.mat4x4,
        normals: gpu.mat4x4,
    }),
    projectionMat: gpu.mat4x4,
})

export class NormalsRenderer {

    private device: gpu.Device
    
    readonly uniforms: gpu.SyncBuffer
    private uniformsGroup: GPUBindGroup

    private nodeGroupLayout: GPUBindGroupLayout
    private pipelineLayout: GPUPipelineLayout

    private fragmentState: GPUFragmentState
    private depthState: GPUDepthStencilState

    private renderer: gpu.GPURenderer | null = null

    private viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
    private modelMatrix = aether.mat4.identity()
    private projectionMatrix = aether.mat4.mul(
        aether.mat4.mul(
            aether.mat4.scaling(1, 1, 0.5),
            aether.mat4.translation([0, 0, 1])
        ),
        aether.mat4.projection(2, undefined, undefined, 2)
    );

    constructor(
        private shaderModule: gpu.ShaderModule,
        private depthTexture: gpu.Texture,
        inputs: ViewInputs,
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
        
        this.nodeGroupLayout = this.device.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                },
            }],
        })

        this.pipelineLayout = this.device.device.createPipelineLayout({
            bindGroupLayouts: [uniformsGroupLayout, this.nodeGroupLayout]
        });

        this.fragmentState = this.shaderModule.fragmentState("f_main", ["rgba32float"]),
        this.depthState = this.depthTexture.depthState(),
    
        gear.Value.from(
            inputs.matModel.map(m => aether.mat4.mul(this.viewMatrix, this.modelMatrix = m)),
            inputs.matView.map(m => aether.mat4.mul(this.viewMatrix = m, this.modelMatrix))
        ).map(m => ({
            positions: m,
            normals: m,
        })).attach(this.setter(uniformsStruct.members.mat))
        this.setter(uniformsStruct.members.projectionMat)(this.projectionMatrix)

        inputs.modelUri.attach((modelUri) => this.loadModel(modelUri))

    }

    private async loadModel(modelUri: string) {
        try {
            this.statusUpdater("Loading model ...");
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
            vertex: this.shaderModule.vertexState("v_main", vertexLayouts),
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

    private statusUpdater: gear.Consumer<string> = () => {}

    readonly status: gear.Value<string> = new gear.Value(consumer => this.statusUpdater = consumer)

    resize(width: number, height: number): void {
        this.depthTexture.resize({ width, height })
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