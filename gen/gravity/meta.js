import * as gpu from '../djee/gpu/index.js';
import { BaseTexture } from './base.texture.js';
export const visualsUniforms = gpu.struct({
    mvpMatrix: gpu.f32.x4.x4,
    mvMatrix: gpu.f32.x4.x4,
    mMatrix: gpu.f32.x4.x4,
    radiusScale: gpu.f32,
});
export const physicsUniforms = gpu.struct({
    bodyFluffiness: gpu.f32,
    gravityConstant: gpu.f32,
    dT: gpu.f32,
});
export const bodyDescription = gpu.struct({
    mass: gpu.f32,
    radius: gpu.f32,
});
export const bodyState = gpu.struct({
    position: gpu.f32.x3,
    velocity: gpu.f32.x3,
});
export const bodyDescriptionAsVertex = gpu.vertex({
    massAndRadius: gpu.f32.x2
});
export const bodyPosition = bodyState.asVertex(['position']);
function shaders(workgroupSize, workgroupSizeX, workgroupSizeY) {
    const templateFunction = code => code
        .replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`)
        .replace(/\[\[workgroup_size_x\]\]/g, `${workgroupSizeX}`)
        .replace(/\[\[workgroup_size_y\]\]/g, `${workgroupSizeY}`);
    const shaderDef = gpu.ShaderModule.from;
    return {
        baseTexture: shaderDef({ code: BaseTexture.shaderCode }),
        bloom: shaderDef({ path: "filter-1d.wgsl", templateFunction }),
        physics: shaderDef({ path: "gravity-compute.wgsl", templateFunction }),
        meshRenderer: shaderDef({ path: "gravity-render.wgsl", templateFunction }),
        pointsRenderer: shaderDef({ path: "gravity-render.points.wgsl", templateFunction }),
    };
}
const groupDef = gpu.BindGroupLayout.from;
const groupLayouts = {
    sampledTexture: groupDef({ entries: {
            textureSampler: gpu.binding(0, ["FRAGMENT"], gpu.sampler("non-filtering")),
            baseTexture: gpu.binding(1, ["FRAGMENT"], gpu.texture("float")),
        } }),
    filter1D: groupDef({ entries: {
            weights: gpu.binding(0, ["COMPUTE"], gpu.buffer("read-only-storage"))
        } }),
    filter1DIO: groupDef({ entries: {
            direction: gpu.binding(0, ["COMPUTE"], gpu.buffer("uniform")),
            source: gpu.binding(1, ["COMPUTE"], gpu.texture("float")),
            target: gpu.binding(2, ["COMPUTE"], gpu.storageTexture("rgba16float")),
        } }),
    universe: groupDef({ entries: {
            universeDesc: gpu.binding(0, ["COMPUTE"], gpu.buffer("read-only-storage")),
            currentState: gpu.binding(1, ["COMPUTE"], gpu.buffer("read-only-storage")),
            nextState: gpu.binding(2, ["COMPUTE"], gpu.buffer("storage")),
            uniforms: gpu.binding(3, ["COMPUTE"], gpu.buffer("uniform")),
        } }),
    visuals: groupDef({ entries: {
            uniforms: gpu.binding(0, ["VERTEX"], gpu.buffer("uniform"))
        } })
};
const pipelineDef = gpu.PipelineLayout.from;
const pipelineLayouts = {
    texturePasting: pipelineDef({ bindGroupLayouts: {
            group: gpu.group(0, groupLayouts.sampledTexture)
        } }),
    filtering: pipelineDef({ bindGroupLayouts: {
            filter: gpu.group(0, groupLayouts.filter1D),
            io: gpu.group(1, groupLayouts.filter1DIO)
        } }),
    physics: pipelineDef({ bindGroupLayouts: {
            universe: gpu.group(0, groupLayouts.universe)
        } }),
    renderer: pipelineDef({ bindGroupLayouts: {
            visuals: gpu.group(0, groupLayouts.visuals)
        } })
};
export function appDefinition(workgroupSize, workgroupSizeX, workgroupSizeY) {
    return gpu.Definition.from({
        device: gpu.Definition.device(),
        shaders: shaders(workgroupSize, workgroupSizeX, workgroupSizeY),
        layout: {
            groupLayouts, pipelineLayouts
        }
    });
}
//# sourceMappingURL=meta.js.map