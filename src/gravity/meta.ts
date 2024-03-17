import * as gpu from '../djee/gpu/index.js'

export type BodyDescriptionStruct = gpu.DataTypeOf<typeof bodyDescription>
export type BodyStateStruct = gpu.DataTypeOf<typeof bodyState>

export const visualsUniforms = gpu.struct({
    mvpMatrix: gpu.f32.x4.x4,
    mvMatrix: gpu.f32.x4.x4,
    mMatrix: gpu.f32.x4.x4,
    radiusScale: gpu.f32,
})

export const physicsUniforms = gpu.struct({
    bodyFluffiness: gpu.f32,
    gravityConstant: gpu.f32,
    dT: gpu.f32,
})
    
export const bodyDescription = gpu.struct({
    mass: gpu.f32,
    radius: gpu.f32,
}) 

export const bodyState = gpu.struct({
    position: gpu.f32.x3,
    velocity: gpu.f32.x3,
})

export const bodyDescriptionAsVertex = gpu.vertex({
    massAndRadius: gpu.f32.x2
})  

export const bodyPosition = bodyState.asVertex(['position'])

export type AppLayout = gpu.AppLayoutFrom<typeof appLayoutBuilder>
export type UniverseBindGroup = gpu.BindGroupFrom<AppLayout, "universe">
export type VisualsBindGroup = gpu.BindGroupFrom<AppLayout, "visuals">
export type Filter1DBindGroup = gpu.BindGroupFrom<AppLayout, "filter1D">
export type Filter1DIOBindGroup = gpu.BindGroupFrom<AppLayout, "filter1DIO">
export type PhysicsPipeline = gpu.ComputePipelineFrom<AppLayout, "physics">
export type FilteringPipeline = gpu.ComputePipelineFrom<AppLayout, "filtering">

export const appLayoutBuilder = gpu.appLayoutBuilder("Gravity")
    .withGroupLayouts({
        sampledTexture: {
            textureSampler: gpu.binding(0, ["FRAGMENT"], gpu.sampler("non-filtering")),
            baseTexture: gpu.binding(1, ["FRAGMENT"], gpu.texture("float")),
        },
        filter1D: {
            weights: gpu.binding(0, ["COMPUTE"], gpu.buffer("read-only-storage"))
        },
        filter1DIO: {
            direction: gpu.binding(0, ["COMPUTE"], gpu.buffer("uniform")),
            source: gpu.binding(1, ["COMPUTE"], gpu.texture("float")),
            target: gpu.binding(2, ["COMPUTE"], gpu.storageTexture("rgba16float")),
        },
        universe: {
            universeDesc: gpu.binding(0, ["COMPUTE"], gpu.buffer("read-only-storage")),
            currentState: gpu.binding(1, ["COMPUTE"], gpu.buffer("read-only-storage")),
            nextState: gpu.binding(2, ["COMPUTE"], gpu.buffer("storage")),
            uniforms: gpu.binding(3, ["COMPUTE"], gpu.buffer("uniform")),
        },
        visuals: {
            uniforms: gpu.binding(0, ["VERTEX"], gpu.buffer("uniform"))
        }
    })
    .withPipelineLayouts({
        texturePasting: {
            group: gpu.group(0, "sampledTexture")
        },
        filtering: {
            filter: gpu.group(0, "filter1D"),
            io: gpu.group(1, "filter1DIO")
        },
        physics: {
            universe: gpu.group(0, "universe")
        },
        renderer: {
            visuals: gpu.group(0, "visuals")
        }
    })