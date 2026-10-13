import { gpu } from "lumen"
import * as gear from "gear"

export type FieldParamsStruct = gpu.DataTypeOf<typeof fieldParamsStruct>
export type UniformsStruct = gpu.DataTypeOf<typeof uniformsStruct>

export const fieldParamsStruct = gpu.struct({
    matrix: gpu.mat3x3,
    displacement: gpu.f32.x3,
    scale: gpu.f32,
    depth: gpu.u32,
}) 

export const uniformsStruct = gpu.struct({
    modelMatrix: gpu.mat3x3,
    orientation: gpu.mat3x3,
    position: gpu.f32.x3,
    lightDirection: gpu.f32.x3,
    lightNarrowness: gpu.f32,
    contourValue: gpu.f32,
    focalLength: gpu.f32,
    step: gpu.f32,
}) 

export type SamplerGroupLayout = GPUToy["groupLayouts"]["sampler"]
export type SamplerGroup = gpu.CompatibleBindGroup<SamplerGroupLayout>
export type SamplerPipelineLayout = GPUToy["pipelineLayouts"]["sampler"]
export type SamplerPipeline = GPUToy["pipelines"]["sampler"]

export type RendererGroupLayout = GPUToy["groupLayouts"]["renderer"]
export type RendererGroup = gpu.CompatibleBindGroup<RendererGroupLayout>
export type RendererPipelineLayout = GPUToy["pipelineLayouts"]["renderer"]

export type GPUToy = ReturnType<typeof newGPUToy> extends Promise<infer T> ? T : never

export async function newGPUToy(device: gpu.Device) {
    const groupLayouts = device.groupLayouts({
        sampler: {
            field: gpu.texture_storage_3d("rgba16float").asEntry(0, "COMPUTE"),
            params: gpu.uniform(fieldParamsStruct).asEntry(1, "COMPUTE"),
        },
        renderer: {
            uniforms: gpu.uniform(uniformsStruct).asEntry(0, "FRAGMENT"),
            field: gpu.texture_3d("float").asEntry(1, "FRAGMENT"),
            sampler: gpu.sampler("filtering").asEntry(2, "FRAGMENT"),
        }
    })

    const pipelineLayouts = device.pipelineLayouts({
        sampler: { group: groupLayouts.sampler.asEntry(0) },
        renderer: { group: groupLayouts.renderer.asEntry(0) }
    })

    const shaderCode = await gear.fetchTextFile("/shaders/field-renderer.wgsl")
    const shaders = await device.shaderModules({
        sampler: { path: "shaders/field-sampler.wgsl" },
        renderer: { code: gpu.renderingShaders.fullScreenPass(shaderCode) },
    })

    const pipelines = {
        sampler: await pipelineLayouts.sampler.computePipeline({ module: shaders.sampler })
    }

    return { device, groupLayouts, pipelineLayouts, pipelines, shaders }
}