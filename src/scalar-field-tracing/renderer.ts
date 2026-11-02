import type { Mat4, Vec3 } from "aether"
import { mat3, mat4, vec3 } from "aether"
import * as gpu from "lumen"
import { GPUToy, RendererGroup, uniformsStruct } from "./toy.gpu.js"

export class FieldRenderer {

    private pipeline: GPURenderPipeline
    private bindGroup: RendererGroup
    private sampler: gpu.Sampler

    private uniforms: gpu.SyncBuffer;

    constructor(private gpuToy: GPUToy, private field: gpu.Texture, targetFormat: gpu.TextureFormatSource) {
        const device = gpuToy.device
        
        this.pipeline = device.wrapped.createRenderPipeline({
            label: "renderer-pipeline",
            layout: gpuToy.pipelineLayouts.renderer.wrapped,
            vertex: gpuToy.shaders.renderer.vertexState("v_main", []),
            fragment: gpuToy.shaders.renderer.fragmentState("f_main", [targetFormat]),
            primitive: {
                topology: "triangle-list"
            },
        })
        this.uniforms = device.syncBuffer({
            label: "renderer-uniforms",
            usage: ["UNIFORM"], 
            data: uniformsStruct.view([{
                modelMatrix: mat3.identity(),
                orientation: mat3.transpose(mat3.lookTowards(vec3.unit([0, 0, -1]))),
                position: vec3.of(0.0, 0.0, 4),
                lightDirection: vec3.unit(vec3.of(-1, 1, 1)),
                lightNarrowness: 1024,
                contourValue: 0.05,
                focalLength: Math.sqrt(5),
                step: 1 / 16, 
            }])
        })
        this.sampler = device.sampler({
            label: "renderer-sampler",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            addressModeW: "clamp-to-edge",
            magFilter: "linear",
            minFilter: "linear",
        })
        this.bindGroup = gpuToy.groupLayouts.renderer.bindGroup({
            uniforms: this.uniforms,
            field: this.field,
            sampler: this.sampler,
        });
    }

    get device() {
        return this.gpuToy.device
    }

    get step(): number {
        return this.uniforms.get(uniformsStruct.members.step);
    }

    set step(v: number) {
        this.uniforms.set(uniformsStruct.members.step, v);
    }

    get contourValue(): number {
        return this.uniforms.get(uniformsStruct.members.contourValue);
    }

    set contourValue(v: number) {
        this.uniforms.set(uniformsStruct.members.contourValue, v);
    }

    get modelMatrix(): Mat4 {
        return mat4.cast(this.uniforms.get(uniformsStruct.members.modelMatrix));
    }

    set modelMatrix(m: Mat4) {
        this.uniforms.set(uniformsStruct.members.modelMatrix, mat3.linearComponent(m));
    }

    get orientation() {
        const m = mat4.cast(this.uniforms.get(uniformsStruct.members.orientation));
        return mat4.transpose(m)
    }

    set orientation(m: Mat4) {
        const o = mat4.transpose(m)
        this.uniforms.set(uniformsStruct.members.orientation, mat3.linearComponent(o))
    }

    get position() {
        return this.uniforms.get(uniformsStruct.members.position)
    }

    set position(p: Vec3) {
        this.uniforms.set(uniformsStruct.members.position, p)
    }

    get focalLength() {
        return this.uniforms.get(uniformsStruct.members.focalLength)
    }

    set focalLength(v: number) {
        this.uniforms.set(uniformsStruct.members.focalLength, v)
    }

    get viewMatrix() {
        const m = mat4.cast(this.uniforms.get(uniformsStruct.members.orientation));
        m[3] = [...this.uniforms.get(uniformsStruct.members.position), 1.0]
        return mat4.inverse(m)
    }

    set viewMatrix(m: Mat4) {
        const o = mat4.inverse(m)
        this.uniforms.set(uniformsStruct.members.orientation, mat3.linearComponent(o))
        this.uniforms.set(uniformsStruct.members.position, vec3.from(o[3]))
    }

    get projectionMatrix() {
        return mat4.projection(this.focalLength)
    }

    get projectionViewMatrix() {
        return mat4.mul(this.projectionMatrix, this.viewMatrix)
    }

    render(attachment: GPURenderPassColorAttachment) {
        const device = this.gpuToy.device
        device.enqueueCommands("renderer-command", encoder => {
            encoder.renderPass({
                colorAttachments: [attachment]
            }, pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.bindGroup.wrapped)
                pass.draw(3)
            })
        })
    }

}
