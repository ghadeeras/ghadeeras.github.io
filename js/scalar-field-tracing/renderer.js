import * as aether from "aether";
import { uniformsStruct } from "./toy.gpu.js";
export class FieldRenderer {
    constructor(gpuToy, field, targetFormat) {
        this.gpuToy = gpuToy;
        this.field = field;
        const device = gpuToy.device;
        this.pipeline = device.wrapped.createRenderPipeline({
            label: "renderer-pipeline",
            layout: gpuToy.pipelineLayouts.renderer.wrapped,
            vertex: gpuToy.shaders.renderer.vertexState("v_main", []),
            fragment: gpuToy.shaders.renderer.fragmentState("f_main", [targetFormat]),
            primitive: {
                topology: "triangle-list"
            },
        });
        this.uniforms = device.syncBuffer({
            label: "renderer-uniforms",
            usage: ["UNIFORM"],
            data: uniformsStruct.view([{
                    modelMatrix: aether.mat3.identity(),
                    orientation: aether.mat3.transpose(aether.mat3.lookTowards(aether.vec3.unit([0, 0, -1]))),
                    position: aether.vec3.of(0.0, 0.0, 4),
                    lightDirection: aether.vec3.unit(aether.vec3.of(-1, 1, 1)),
                    lightNarrowness: 1024,
                    contourValue: 0.05,
                    focalLength: Math.sqrt(5),
                    step: 1 / 16,
                }])
        });
        this.sampler = device.sampler({
            label: "renderer-sampler",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            addressModeW: "clamp-to-edge",
            magFilter: "linear",
            minFilter: "linear",
        });
        this.bindGroup = gpuToy.groupLayouts.renderer.bindGroup({
            uniforms: this.uniforms,
            field: this.field,
            sampler: this.sampler,
        });
    }
    get device() {
        return this.gpuToy.device;
    }
    get step() {
        return this.uniforms.get(uniformsStruct.members.step);
    }
    set step(v) {
        this.uniforms.set(uniformsStruct.members.step, v);
    }
    get contourValue() {
        return this.uniforms.get(uniformsStruct.members.contourValue);
    }
    set contourValue(v) {
        this.uniforms.set(uniformsStruct.members.contourValue, v);
    }
    get modelMatrix() {
        return aether.mat4.cast(this.uniforms.get(uniformsStruct.members.modelMatrix));
    }
    set modelMatrix(m) {
        this.uniforms.set(uniformsStruct.members.modelMatrix, aether.mat3.from([
            ...aether.vec3.from(m[0]),
            ...aether.vec3.from(m[1]),
            ...aether.vec3.from(m[2]),
        ]));
    }
    get orientation() {
        const m = aether.mat4.cast(this.uniforms.get(uniformsStruct.members.orientation));
        return aether.mat4.transpose(m);
    }
    set orientation(m) {
        const o = aether.mat4.transpose(m);
        this.uniforms.set(uniformsStruct.members.orientation, aether.mat3.from([
            ...aether.vec3.from(o[0]),
            ...aether.vec3.from(o[1]),
            ...aether.vec3.from(o[2]),
        ]));
    }
    get position() {
        return this.uniforms.get(uniformsStruct.members.position);
    }
    set position(p) {
        this.uniforms.set(uniformsStruct.members.position, p);
    }
    get focalLength() {
        return this.uniforms.get(uniformsStruct.members.focalLength);
    }
    set focalLength(v) {
        this.uniforms.set(uniformsStruct.members.focalLength, v);
    }
    get viewMatrix() {
        const m = aether.mat4.cast(this.uniforms.get(uniformsStruct.members.orientation));
        m[3] = [...this.uniforms.get(uniformsStruct.members.position), 1.0];
        return aether.mat4.inverse(m);
    }
    set viewMatrix(m) {
        const o = aether.mat4.inverse(m);
        this.uniforms.set(uniformsStruct.members.orientation, aether.mat3.from([
            ...aether.vec3.from(o[0]),
            ...aether.vec3.from(o[1]),
            ...aether.vec3.from(o[2]),
        ]));
        this.uniforms.set(uniformsStruct.members.position, aether.vec3.from(o[3]));
    }
    get projectionMatrix() {
        return aether.mat4.projection(this.focalLength);
    }
    get projectionViewMatrix() {
        return aether.mat4.mul(this.projectionMatrix, this.viewMatrix);
    }
    render(attachment) {
        const device = this.gpuToy.device;
        device.enqueueCommands("renderer-command", encoder => {
            encoder.renderPass({
                colorAttachments: [attachment]
            }, pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, this.bindGroup.wrapped);
                pass.draw(3);
            });
        });
    }
}
//# sourceMappingURL=renderer.js.map