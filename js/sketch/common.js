import { gpu } from "lumen";
export const strokeAttributesStruct = gpu.struct({
    thickness: gpu.f32,
    tension: gpu.f32,
});
export const strokePointsPairStruct = gpu.struct({
    left: gpu.f32.x2,
    right: gpu.f32.x2,
    linear: gpu.f32.x2,
});
export const commonWGSL = /* wgsl */ `

    const PI = atan2(0.0, -1.0);

    struct StrokeAttributes {
        thickness: f32,
        tension: f32,
    }

    struct StrokePointsPair {
        left: vec2f,
        right: vec2f,
        linear: vec2f,
    }

`;
//# sourceMappingURL=common.js.map