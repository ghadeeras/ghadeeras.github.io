import type { Mat4 } from "aether";
import { mat4, vec3, vec4 } from "aether";
import * as gpu from "lumen";
import { glWebGPU, xrContext } from "webgxx";
import { gltfMaterialsStruct } from "../djee/gltf.gpu.js";
import { GLTFRenderer } from "../djee/gltf/gltf.renderer.js";
import { gltf, gltf_gpu } from "../djee/index.js";
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
    lightPos: gpu.f32.x4,
    material: gltfMaterialsStruct,
})

type UniformGroupLayout = ReturnType<typeof uniformsGroupLayout>
function uniformsGroupLayout(device: gpu.Device) {
    return device.groupLayout({
        uniforms: gpu.uniform(uniformsStruct).asEntry(0, "VERTEX", "FRAGMENT"),
        clock: gpu.storage("read_write", gpu.u32).asEntry(1, "FRAGMENT"),
    });
}

type SkyPipelineLayout = ReturnType<typeof skyPipelineLayout>
function skyPipelineLayout(device: gpu.Device, layout: UniformGroupLayout) {
    return device.pipelineLayout({
        uniforms: { group: 0, layout: layout }
    }, "sky pipeline layout");
}

export class GPUView implements View {

    private gpuCanvas: gpu.Canvas
    private depthTexture: gpu.Texture

    private uniforms: gpu.DataTypeOf<typeof uniformsStruct>

    private uniformsBuffer: gpu.SyncBuffer
    private clock: gpu.DataBuffer
    private uniformsGroupLayout: UniformGroupLayout
    private uniformsGroup: gpu.CompatibleBindGroup<UniformGroupLayout>

    private pipelineLayout: GPUPipelineLayout
    private skyPipelineLayout: SkyPipelineLayout
    private skyPipeline: GPURenderPipeline

    private depthState: GPUDepthStencilState

    private rendererFactory: gltf_gpu.GPURendererFactory
    private renderer: GLTFRenderer<any, any, any, any, any, any, any> | null = null

    private _viewMatrix = mat4.identity()
    private _modelMatrix = mat4.identity()

    private perspective: gltf.graph.Perspective = gltf.graph.defaultPerspective()

    constructor(
        private device: gpu.Device,
        private vertexShader: gpu.ShaderModule,
        private fragmentShader: gpu.ShaderModule,
        private skyVertexShader: gpu.ShaderModule,
        private skyFragmentShader: gpu.ShaderModule,
        canvasId: string,
    ) {
 
        this.gpuCanvas = device.canvas(canvasId, 4)
        this.depthTexture = this.gpuCanvas.depthTexture()

        this.uniformsBuffer = device.syncBuffer({
            label: "uniforms",
            usage: ["UNIFORM"], 
            data: uniformsStruct.view([{
                lightPos: vec4.of(0, 0, 1, 0),
                mat: {
                    positions: mat4.identity(),
                    normals: mat4.identity(),
                },
                projectionMat: mat4.identity(),
                material: {
                    baseColorFactor: vec4.fromScalar(1.0),
                    emissiveFactor: vec3.fromScalar(1.0),
                    metallicFactor: 1.0,
                    roughnessFactor: 1.0,
                    alphaCutoff: 0.0
                }
            }])
        });
        this.uniforms = this.uniformsBuffer.as(uniformsStruct)
        this.clock = device.dataBuffer({ usage: ["STORAGE", "UNIFORM"], data: gpu.u32.view([1]) })
        this.uniformsGroupLayout = uniformsGroupLayout(device)
        this.uniformsGroup = this.uniformsGroupLayout.bindGroup({
            uniforms: this.uniformsBuffer,
            clock: this.clock
        });

        this.rendererFactory = new gltf_gpu.GPURendererFactory(
            this.device,
            1, 
            2,
            { POSITION: 0, NORMAL: 1, TANGENT:2, TEXCOORD_BASE_COLOR: 3, TEXCOORD_METALLIC_ROUGHNESS: 4, TEXCOORD_TEXCOORD_EMISSIVE: 5, TEXCOORD_TEXCOORD_OCCLUSION: 6, TEXCOORD_TEXCOORD_NORMAL: 7 },
            (layouts, primitiveState) => this.primitivePipeline(layouts, primitiveState)
        )

        this.pipelineLayout = this.device.wrapped.createPipelineLayout({
            bindGroupLayouts: [this.uniformsGroupLayout.wrapped, this.rendererFactory.matricesGroupLayout, this.rendererFactory.materialsGroupLayout],
        });

        this.skyPipelineLayout = skyPipelineLayout(device, this.uniformsGroupLayout)
        this.skyPipeline = device.wrapped.createRenderPipeline({
            layout: this.skyPipelineLayout.wrapped,
            vertex: {
                module: this.skyVertexShader.wrapped,
                entryPoint: "v_sky",
            },
            fragment: {
                module: this.skyFragmentShader.wrapped,
                entryPoint: "f_sky",
                targets: [{
                    format: this.gpuCanvas.srgbFormat
                }],
            },
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
        })

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
        this.uniforms.material.baseColorFactor = color
    }

    get lightPosition() {
        return this.uniforms.lightPos
    }

    set lightPosition(p: [number, number, number, number]) {
        this.uniforms.lightPos = p
    }

    set roughnessFactor(r: number) {
        this.uniforms.material.roughnessFactor = r
    }

    set metallicFactor(m: number) {
        this.uniforms.material.metallicFactor = m
    }

    get projectionMatrix() {
        return this.uniforms.projectionMat
    }

    set projectionMatrix(m: Mat4) {
        this.uniforms.projectionMat = m
    }

    get viewMatrix() {
        return this._viewMatrix
    }

    set viewMatrix(m: Mat4) {
        this._viewMatrix = m
        this.resetModelViewMatrix();
    }

    get modelMatrix() {
        return this._modelMatrix
    }

    set modelMatrix(m: Mat4) {
        this._modelMatrix = m
        this.resetModelViewMatrix();
    }

    private resetModelViewMatrix() {
        const mvMat = mat4.mul(this._viewMatrix, this._modelMatrix);
        this.uniforms.mat = { normals: mvMat, positions: mvMat };
    }

    async loadModel(modelUri: string): Promise<gltf.graph.Model> {
        const model = await gltf.graph.Model.create(modelUri);
        this.perspective = model.scene.perspectives[0]
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio)
        this.viewMatrix = this.perspective.matrix
        this.modelMatrix = this.perspective.modelMatrix
        this.resetModelViewMatrix()
        if (this.renderer !== null) {
            this.renderer.destroy();
            this.renderer = null;
        }
        this.renderer = await this.rendererFactory.newInstance(model);
        return model
    }

    private primitivePipeline(vertexLayouts: GPUVertexBufferLayout[], primitiveState: GPUPrimitiveState): GPURenderPipeline {
        return this.device.wrapped.createRenderPipeline({
            layout: this.pipelineLayout,
            vertex: {
                module: this.vertexShader.wrapped,
                entryPoint: "v_main",
                buffers: vertexLayouts
            },
            primitive: primitiveState,
            fragment: this.fragmentShader.fragmentState("f_main", [this.gpuCanvas.srgbFormat]),
            depthStencil: this.depthState,
            multisample: {
                count: this.gpuCanvas.sampleCount
            },
        });
    }

    resize() {
        this.gpuCanvas.resize();
        this.depthTexture.size = this.gpuCanvas.size;
        this.projectionMatrix = this.perspective.camera.matrix(this.aspectRatio, this.focalLength)
    }

    draw() {
        this.clock.setData(gpu.u32.view([Math.round(Math.random() * 0xFFFFFFFF) | 1]))
        this.device.enqueueCommands("render", encoder => {
            const clearAttachment = this.gpuCanvas.attachment({ r: 0, g: 0, b: 0, a: 1 }, true);
            const clearAndStoreAttachment: GPURenderPassColorAttachment = { ...clearAttachment, storeOp: "store" }
            const noClearAttachment: GPURenderPassColorAttachment = { ...clearAttachment, loadOp: "load" }
            
            encoder.renderPass({
                colorAttachments: [clearAndStoreAttachment]
            }, pass => {
                pass.setPipeline(this.skyPipeline)
                this.skyPipelineLayout.addTo(pass, { uniforms: this.uniformsGroup })
                pass.draw(3)
            })
            encoder.renderPass({
                colorAttachments: [noClearAttachment],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment(0)
            }, pass => {
                if (this.renderer !== null) {
                    pass.setBindGroup(0, this.uniformsGroup.wrapped)
                    this.renderer.render(pass)
                }
            })
        })
    }

    get xrContext(): WebGL2RenderingContext | null {
        return xrContext(this.device.wrapped)
    }

}

export async function newViewFactory(canvasId: string): Promise<ViewFactory> {
    const gpuParam = new URL(location.href).searchParams.get("gpu")
    if (gpuParam && gpuParam?.toUpperCase() == 'N') {
        throw new Error("Unsupported by choice")
    }
    const device = await gpu.Device.instance()
    const shaderModule = await device.shaderModule({ path: "shaders/gltf.wgsl" })
    return () => new GPUView(device, shaderModule, shaderModule, shaderModule, shaderModule, canvasId)
}

export async function newGLViewFactory(canvasId: string): Promise<ViewFactory> {
    const gpuParam = new URL(location.href).searchParams.get("gpu")
    if (gpuParam && gpuParam?.toUpperCase() == 'N') {
        throw new Error("Unsupported by choice")
    }
    const device = await gpu.Device.instance({ xrCompatible: true }, glWebGPU(document.getElementById(canvasId) as HTMLCanvasElement))
    const vertexShader = await device.shaderModule({ path: "shaders/gltf.vert" })
    const fragmentShader = await device.shaderModule({ path: "shaders/gltf.frag" })
    const skyVertexShader = await device.shaderModule({ path: "shaders/gltf.sky.vert" })
    const skyFragmentShader = await device.shaderModule({ path: "shaders/gltf.sky.frag" })
    return () => new GPUView(device, vertexShader, fragmentShader, skyVertexShader, skyFragmentShader, canvasId)
}
