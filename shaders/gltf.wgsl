const epsilon = 1.220703125e-4;
const pi = atan2(0.0, -1.0);
const minLightRadius = sin(pi *  0.5 / 180.0);
const maxLightRadius = sin(pi * 15.0 / 180.0);
const dielectricSpecularBase = vec3(0.04);
const ambientLight = 0.125 * 0.125;

struct Uniforms {
    positionsMat: mat4x4<f32>,
    normalsMat: mat4x4<f32>,
    projectionMat: mat4x4<f32>,
    lightPos: vec4<f32>,
    lightRadius: f32,
    fogginess: f32,
    material: Material,
};

struct Node {
    positionsMat: mat4x4<f32>,
    normalsMat: mat4x4<f32>,
}

struct Material {
    baseColorFactor: vec4f,
    metallicFactor: f32,
    roughnessFactor: f32,
    emissiveFactor: vec3f,
}

@group(0)
@binding(0)
var<uniform> uniforms: Uniforms;

@group(1)
@binding(0)
var<uniform> node: Node;

@group(2)
@binding(0)
var<uniform> material: Material;

@group(2)
@binding(1)
var baseColorTexture: texture_2d<f32>;

@group(2)
@binding(2)
var baseColorSampler: sampler;

@group(2)
@binding(3)
var metallicRoughnessTexture: texture_2d<f32>;

@group(2)
@binding(4)
var metallicRoughnessSampler: sampler;

@group(2)
@binding(5)
var emissiveTexture: texture_2d<f32>;

@group(2)
@binding(6)
var emissiveSampler: sampler;

@group(2)
@binding(7)
var occlusionTexture: texture_2d<f32>;

@group(2)
@binding(8)
var occlusionSampler: sampler;

fn color(
    position: vec3<f32>,
    normal: vec3<f32>,
    baseColor: vec4<f32>,
    metallicRoughness: vec4<f32>,
    emissive: vec4<f32>,
    occlusion: vec4<f32>,
) -> vec4<f32> {
    let viewDir = normalize(-position);
    let lightDir = normalize(uniforms.lightPos.xyz);
    let lightRadius = mix(minLightRadius, maxLightRadius, uniforms.lightRadius);

    let materialColor = uniforms.material.baseColorFactor * material.baseColorFactor * baseColor;
    let emissiveFactor = uniforms.material.emissiveFactor * material.emissiveFactor * emissive.rgb;
    let metallicFactor = uniforms.material.metallicFactor * material.metallicFactor * metallicRoughness.b;
    let roughnessFactor = uniforms.material.roughnessFactor * material.roughnessFactor * metallicRoughness.g;
    let smoothnessFactor = 1.0 / mix(epsilon, 1.0, roughnessFactor);

    let fogFactor = exp2(position.z * uniforms.fogginess / 8.0);

    let cosLN = dot(lightDir, normal);
    let clampedCosLN = clamp(cosLN + lightRadius, 0.0, 1.0);
    let cosVN = dot(viewDir, normal);
    let clampedCosVN = max(cosVN, 0.0);
    let reflection = 2.0 * clampedCosVN * normal - viewDir;
    let cosLR = dot(lightDir, reflection);
    let clampedCosLR = clamp(cosLR + lightRadius, 0.0, 1.0);

    let diffuseBase = mix(materialColor.rgb, vec3(0.0), metallicFactor);
    let specularBase = mix(mix(dielectricSpecularBase, materialColor.rgb, metallicFactor), vec3(1.0), pow(1.0 - clampedCosVN, 5.0));
    let specular = pow(clampedCosLR, smoothnessFactor) * (1.0 + smoothnessFactor) * 0.25;
    let diffuseAmbient = ambientLight * (cosLN + 1.0);
    let specularAmbient = ambientLight * (cosLR + 1.0);
    let color = ((clampedCosLN + diffuseAmbient) * diffuseBase + (specular + specularAmbient) * specularBase) * occlusion.r + emissiveFactor;
    let foggedColor = mix(vec3<f32>(ambientLight), color, fogFactor);

    return vec4<f32>(foggedColor, materialColor.a);
}

struct VertexOutput {
    @builtin(position) projPos: vec4<f32>,
    @location(0) pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) texcoordBaseColor: vec2<f32>,
    @location(3) texcoordMetallicRoughness: vec2<f32>,
    @location(4) texcoordEmissive: vec2<f32>,
    @location(5) texcoordOcclusion: vec2<f32>,
};

@vertex
fn v_main(
    @location(0) pos: vec3<f32>, 
    @location(1) normal: vec3<f32>,
    @location(2) texcoordBaseColor: vec2<f32>,
    @location(3) texcoordMetallicRoughness: vec2<f32>,
    @location(4) texcoordEmissive: vec2<f32>,
    @location(5) texcoordOcclusion: vec2<f32>,
) -> VertexOutput {
    let newPos = uniforms.positionsMat * node.positionsMat * vec4<f32>(pos, 1.0);
    let newNormal = uniforms.normalsMat * node.normalsMat * vec4<f32>(normal, 0.0);
    return VertexOutput(
        uniforms.projectionMat * newPos,
        newPos.xyz,
        newNormal.xyz,
        texcoordBaseColor,
        texcoordMetallicRoughness,
        texcoordEmissive,
        texcoordOcclusion,
    );
}

@fragment
fn f_main(
    @location(0) fragPosition: vec3<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) texcoordBaseColor: vec2<f32>,
    @location(3) texcoordMetallicRoughness: vec2<f32>,
    @location(4) texcoordEmissive: vec2<f32>,
    @location(5) texcoordOcclusion: vec2<f32>,
    @builtin(front_facing) frontFacing: bool,
) -> @location(0) vec4<f32> {
    let normal = normalize(select(
        select(-fragNormal, fragNormal, frontFacing), 
        cross(dpdy(fragPosition), dpdx(fragPosition)), 
        all(fragNormal == vec3(0.0))
    ));
    let baseColor = textureSample(baseColorTexture, baseColorSampler, texcoordBaseColor);
    let metallicRoughness = textureSample(metallicRoughnessTexture, metallicRoughnessSampler, texcoordMetallicRoughness);
    let emissive = textureSample(emissiveTexture, emissiveSampler, texcoordEmissive);
    let occlusion = textureSample(occlusionTexture, occlusionSampler, texcoordOcclusion);
    if (baseColor.a < 0.5) {
        discard;
    }
    return color(fragPosition, normal, baseColor, metallicRoughness, emissive, occlusion);
}
