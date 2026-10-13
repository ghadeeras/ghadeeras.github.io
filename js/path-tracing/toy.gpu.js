import { gpu } from "lumen";
export const volumeStruct = gpu.struct({
    min: gpu.f32.x3,
    max: gpu.f32.x3,
    invSize: gpu.f32.x3,
});
export const faceDirectionsStruct = gpu.struct({
    lights: gpu.u32.times(4),
});
export const uniformsStruct = gpu.struct({
    matrix: gpu.mat3x3,
    position: gpu.f32.x3,
    focalLength: gpu.f32,
    aspectRatio: gpu.f32,
    samplesPerPixel: gpu.u32,
});
export const boxStruct = gpu.struct({
    volume: volumeStruct,
    faceMaterials: gpu.u32.times(6),
});
export const boxDirectionsStruct = gpu.struct({
    faces: faceDirectionsStruct.times(6),
});
export const rectangleStruct = gpu.struct({
    position: gpu.f32.x3,
    size: gpu.f32.x2,
    face: gpu.i32,
    area: gpu.f32,
});
export const cellStruct = gpu.struct({
    boxes: gpu.u32.times(8),
    size: gpu.u32,
});
export async function newGPUToy(device) {
    const groupLayouts = device.groupLayouts({
        denoiser: {
            colors: gpu.texture_2d("unfilterable-float").asEntry(0, "FRAGMENT"),
            normals: gpu.texture_2d("unfilterable-float").asEntry(1, "FRAGMENT"),
        },
        stacker: {
            frameViews: gpu.storage("read", uniformsStruct, 256).asEntry(0, "FRAGMENT"),
            stack: gpu.texture_2d_array("float").asEntry(1, "FRAGMENT"),
            normals: gpu.texture_2d("unfilterable-float").asEntry(2, "FRAGMENT"),
            sampler: gpu.sampler("filtering").asEntry(3, "FRAGMENT"),
        },
        tracer: {
            uniformsBuffer: gpu.uniform(uniformsStruct).asEntry(0, "VERTEX", "FRAGMENT"),
            materialsBuffer: gpu.storage("read", gpu.f32.x4).asEntry(1, "FRAGMENT"),
            boxesBuffer: gpu.storage("read", boxStruct).asEntry(2, "FRAGMENT"),
            gridBuffer: gpu.storage("read", cellStruct, 262144).asEntry(3, "FRAGMENT"),
            importantDirectionsBuffer: gpu.storage("read_write", boxDirectionsStruct).asEntry(4, "FRAGMENT"),
            clockBuffer: gpu.storage("read_write", gpu.u32).asEntry(5, "FRAGMENT"),
        }
    });
    const pipelineLayouts = device.pipelineLayouts({
        denoiser: { group: groupLayouts.denoiser.asEntry(0) },
        stacker: { group: groupLayouts.stacker.asEntry(0) },
        tracer: { group: groupLayouts.tracer.asEntry(0) }
    });
    const shaders = await device.shaderModules({
        denoiser: { path: "shaders/denoiser.wgsl" },
        stacker: { path: "shaders/stacker.wgsl" },
        tracer: { path: "shaders/path-tracing.wgsl" },
    });
    return {
        device, groupLayouts, pipelineLayouts, shaders
    };
}
//# sourceMappingURL=toy.gpu.js.map