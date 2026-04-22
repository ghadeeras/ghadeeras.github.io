import { gpu } from "lumen"

export type StrokeAttributes = gpu.DataTypeOf<typeof strokeAttributesStruct>
export const strokeAttributesStruct = gpu.struct({
    color: gpu.f32.x4,
    thickness: gpu.f32,
    tension: gpu.f32,
}) 

export type StrokePointsPair = gpu.DataTypeOf<typeof strokePointsPairStruct>
export const strokePointsPairStruct = gpu.struct({
    left: gpu.f32.x2,
    right: gpu.f32.x2,
    linear: gpu.f32.x2,
}) 

export type View = gpu.DataTypeOf<typeof viewStruct>
export const viewStruct = gpu.struct({
    matrix: gpu.mat3x3,
    inverse_matrix: gpu.mat3x3,
    width: gpu.f32,
    height: gpu.f32
})

export const strokeAttributesBinding = gpu.uniform(strokeAttributesStruct)
export const strokePointsBinding = gpu.storage("read", strokePointsPairStruct)
export const viewBinding = gpu.uniform(viewStruct)

export type StrokeBindGroup = gpu.CompatibleBindGroup<GroupLayouts["stroke"]>
export type ViewBindGroup = gpu.CompatibleBindGroup<GroupLayouts["view"]>
export type GroupLayouts = ReturnType<typeof groupLayouts>
export function groupLayouts(device: gpu.Device, label?: string) {
    return device.groupLayouts({
        stroke: {
            strokeAttributes: strokeAttributesBinding.asEntry(0, "FRAGMENT"),
            strokePoints: strokePointsBinding.asEntry(1, "VERTEX"),
        },
        view: {
            view: viewBinding.asEntry(0, "VERTEX", "FRAGMENT")
        }
    }, label)
}

export const commonWGSL = /* wgsl */ `

    const PI = atan2(0.0, -1.0);

    struct StrokeAttributes {
        color: vec4f,
        thickness: f32,
        tension: f32,
    }

    struct StrokePointsPair {
        left: vec2f,
        right: vec2f,
        linear: vec2f,
    }

    struct View {
        matrix: mat3x3f,
        inverse_matrix: mat3x3f,
        width: f32,
        height: f32,
    }

`