import { gpu } from 'lumen'
import { BaseTexture } from './base.texture.js'

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

export async function appDefinition(device: gpu.Device, workgroupSize: number, workgroupSizeX: number, workgroupSizeY: number) {
    const groupLayouts = device.groupLayouts({
        sampledTexture: { entries: {
            textureSampler: { binding: 0, visibility: ["FRAGMENT"], sampler: { type: "non-filtering" } },
            baseTexture: { binding: 1, visibility: ["FRAGMENT"],texture: { sampleType: "float" } },
        }},
        filter1D: { entries: {
            weights: { binding: 0, visibility: ["COMPUTE"], buffer: { type: "read-only-storage" } }
        }},
        filter1DIO: { entries: {
            direction: { binding: 0, visibility: ["COMPUTE"], buffer: { type: "uniform" } },
            source: { binding: 1, visibility: ["COMPUTE"], texture: { sampleType: "float" } },
            target: { binding: 2, visibility: ["COMPUTE"], storageTexture: { format: "rgba16float" } },
        }},
        universe: { entries: {
            universeDesc: { binding: 0, visibility: ["COMPUTE"], buffer: { type: "read-only-storage" } },
            currentState: { binding: 1, visibility: ["COMPUTE"], buffer: { type: "read-only-storage" } },
            nextState: { binding: 2, visibility: ["COMPUTE"], buffer: { type: "storage" } },
            uniforms: { binding: 3, visibility: ["COMPUTE"], buffer: { type: "uniform" } },
        }},
        visuals: { entries: {
            uniforms: { binding: 0, visibility: ["VERTEX"], buffer: { type: "uniform" } }
        }}
    })

    const pipelineLayouts = device.pipelineLayouts({
        texturePasting: { bindGroupLayouts: {
            group: groupLayouts.sampledTexture.asEntry(0)
        }},
        filtering: { bindGroupLayouts: {
            filter: groupLayouts.filter1D.asEntry(0),
            io: groupLayouts.filter1DIO.asEntry(1)
        }},
        physics: { bindGroupLayouts: {
            universe: groupLayouts.universe.asEntry(0)
        }},
        renderer: { bindGroupLayouts: {
            visuals: groupLayouts.visuals.asEntry(0)
        }}
    })
    return {
        device,
        shaders: await shaders(device, workgroupSize, workgroupSizeX, workgroupSizeY), 
        layout: {
            groupLayouts, pipelineLayouts
        }
    }
}

async function shaders(device: gpu.Device, workgroupSize: number, workgroupSizeX: number, workgroupSizeY: number) {
    const templateFunction: (code: string) => string = code => code
        .replace(/\[\[workgroup_size\]\]/g, `${workgroupSize}`)
        .replace(/\[\[workgroup_size_x\]\]/g, `${workgroupSizeX}`)
        .replace(/\[\[workgroup_size_y\]\]/g, `${workgroupSizeY}`)
    return await device.shaderModules({
        baseTexture: { code: BaseTexture.shaderCode },
        bloom: { path: "filter-1d.wgsl", templateFunction },
        physics: { path: "gravity-compute.wgsl", templateFunction },
        meshRenderer: { path: "gravity-render.wgsl", templateFunction },
        pointsRenderer: { path: "gravity-render.points.wgsl", templateFunction },
    })
}

export type App = ReturnType<typeof appDefinition> extends Promise<infer A> ? A : never
export type AppLayout = App["layout"]

