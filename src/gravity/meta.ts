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
        sampledTexture: {
            textureSampler: gpu.sampler("non-filtering").asEntry(0, "FRAGMENT"),
            baseTexture: gpu.texture_2d("float").asEntry(1, "FRAGMENT"),
        },
        filter1D: { 
            weights: gpu.storage("read", gpu.f32).asEntry(0, "COMPUTE")
        },
        filter1DIO: {
            direction: gpu.uniform(gpu.f32).asEntry(0, "COMPUTE"),
            source: gpu.texture_2d("float").asEntry(1, "COMPUTE"),
            target: gpu.texture_storage_2d("rgba16float").asEntry(2, "COMPUTE"),
        },
        universe: {
            universeDesc: gpu.storage("read", bodyDescription).asEntry(0, "COMPUTE"),
            currentState: gpu.storage("read", bodyState).asEntry(1, "COMPUTE"),
            nextState: gpu.storage("write", bodyState).asEntry(2, "COMPUTE"),
            uniforms: gpu.uniform(physicsUniforms).asEntry(3, "COMPUTE"),
        },
        visuals: {
            uniforms: gpu.uniform(visualsUniforms).asEntry(0, "VERTEX")
        }
    })

    const pipelineLayouts = device.pipelineLayouts({
        texturePasting: {
            group: groupLayouts.sampledTexture.asEntry(0)
        },
        filtering: {
            filter: groupLayouts.filter1D.asEntry(0),
            io: groupLayouts.filter1DIO.asEntry(1)
        },
        physics: {
            universe: groupLayouts.universe.asEntry(0)
        },
        renderer: {
            visuals: groupLayouts.visuals.asEntry(0)
        }
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

