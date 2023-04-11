import * as gpu from "../djee/gpu/index.js"
import * as gear from "../utils/gear.js";
import * as aether from "/aether/latest/index.js";

export class FieldRenderer {

    private static uniformsStruct = gpu.struct({
        modelMatrix: gpu.mat3x3,
        orientation: gpu.mat3x3,
        position: gpu.f32.x3,
        lightDirection: gpu.f32.x3,
        lightNarrowness: gpu.f32,
        contourValue: gpu.f32,
        focalLength: gpu.f32,
        step: gpu.f32,
        samplesPerPixel: gpu.u32,
    }) 

    private pipeline: GPURenderPipeline
    private bindGroup: GPUBindGroup

    private uniforms: gpu.SyncBuffer;

    constructor(private shader: gpu.ShaderModule, private field: gpu.Texture, private targetFormat: gpu.TextureFormatSource) {
        const device = shader.device
        const bindGroupLayout = device.device.createBindGroupLayout({
            label: "renderer-group-layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform"
                }
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "3d",
                }
            }, {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: "filtering",
                }
            }]
        })
        const pipelineLayout = device.device.createPipelineLayout({
            label: "renderer-pipeline-layout",
            bindGroupLayouts: [bindGroupLayout]
        })
        this.pipeline = device.device.createRenderPipeline({
            label: "renderer-pipeline",
            layout: pipelineLayout,
            vertex: shader.vertexState("v_main", []),
            fragment: shader.fragmentState("f_main", [targetFormat]),
            primitive: {
                topology: "triangle-list"
            },
        })
        this.uniforms = device.syncBuffer("renderer-uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, FieldRenderer.uniformsStruct.view([{
            modelMatrix: aether.mat3.identity(),
            orientation: aether.mat3.transpose(aether.mat3.lookTowards(aether.vec3.unit([0, 0, -1]))),
            position: aether.vec3.of(0.0, 0.0, 4),
            lightDirection: aether.vec3.unit(aether.vec3.of(-1, 1, 1)),
            lightNarrowness: 1024,
            contourValue: 0.05,
            focalLength: Math.sqrt(5),
            step: 1 / 16, 
            samplesPerPixel: 4,
        }]))
        const sampler = device.sampler({
            label: "renderer-sampler",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            addressModeW: "clamp-to-edge",
            magFilter: "linear",
            minFilter: "linear",
        })
        this.bindGroup = device.bindGroup(bindGroupLayout, [this.uniforms, field.createView({
            dimension: "3d",
        }), sampler])
    }

    get contourValue(): number {
        return this.uniforms.get(FieldRenderer.uniformsStruct.members.contourValue);
    }

    set contourValue(v: number) {
        this.uniforms.set(FieldRenderer.uniformsStruct.members.contourValue, v);
    }

    get modelMatrix(): aether.Mat4 {
        return aether.mat4.cast(this.uniforms.get(FieldRenderer.uniformsStruct.members.modelMatrix));
    }

    set modelMatrix(m: aether.Mat4) {
        this.uniforms.set(FieldRenderer.uniformsStruct.members.modelMatrix, aether.mat3.from([
            ...aether.vec3.from(m[0]),
            ...aether.vec3.from(m[1]),
            ...aether.vec3.from(m[2]),
        ]));
    }

    get orientation() {
        const m = aether.mat4.cast(this.uniforms.get(FieldRenderer.uniformsStruct.members.orientation));
        return aether.mat4.transpose(m)
    }

    set orientation(m: aether.Mat4) {
        const o = aether.mat4.transpose(m)
        this.uniforms.set(FieldRenderer.uniformsStruct.members.orientation, aether.mat3.from([
            ...aether.vec3.from(o[0]),
            ...aether.vec3.from(o[1]),
            ...aether.vec3.from(o[2]),
        ]))
    }

    get position() {
        return this.uniforms.get(FieldRenderer.uniformsStruct.members.position)
    }

    set position(p: aether.Vec3) {
        this.uniforms.set(FieldRenderer.uniformsStruct.members.position, p)
    }

    get focalLength() {
        return this.uniforms.get(FieldRenderer.uniformsStruct.members.focalLength)
    }

    set focalLength(v: number) {
        this.uniforms.set(FieldRenderer.uniformsStruct.members.focalLength, v)
    }

    get viewMatrix() {
        const m = aether.mat4.cast(this.uniforms.get(FieldRenderer.uniformsStruct.members.orientation));
        m[3] = [...this.uniforms.get(FieldRenderer.uniformsStruct.members.position), 1.0]
        return aether.mat4.inverse(m)
    }

    set viewMatrix(m: aether.Mat4) {
        const o = aether.mat4.inverse(m)
        this.uniforms.set(FieldRenderer.uniformsStruct.members.orientation, aether.mat3.from([
            ...aether.vec3.from(o[0]),
            ...aether.vec3.from(o[1]),
            ...aether.vec3.from(o[2]),
        ]))
        this.uniforms.set(FieldRenderer.uniformsStruct.members.position, aether.vec3.from(o[3]))
    }

    get projectionMatrix() {
        return aether.mat4.projection(this.focalLength)
    }

    get projectionViewMatrix() {
        return aether.mat4.mul(this.projectionMatrix, this.viewMatrix)
    }

    render(attachment: GPURenderPassColorAttachment) {
        const device = this.shader.device
        device.enqueueCommand("renderer-command", encoder => {
            encoder.renderPass({
                colorAttachments: [attachment]
            }, pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.bindGroup)
                pass.draw(3)
            })
        })
    }

    static async create(field: gpu.Texture, targetFormat: gpu.TextureFormatSource): Promise<FieldRenderer> {
        const shaderCode = await gear.fetchTextFile("/shaders/field-renderer.wgsl")
        const shader = await field.device.shaderModule("field-renderer", gpu.renderingShaders.fullScreenPass(shaderCode))
        return new FieldRenderer(shader, field, targetFormat)
    }

}
