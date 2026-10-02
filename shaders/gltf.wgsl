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
    alphaCutoff: f32,
}

@group(0)
@binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1)
var<storage, read_write> clock: atomic<u32>;

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

@group(2)
@binding(9)
var normalTexture: texture_2d<f32>;

@group(2)
@binding(10)
var normalSampler: sampler;

// ####################################
// Pseudo Random Generation ... The xorshift128 PRNG algorithm. See: https://en.wikipedia.org/wiki/Xorshift
const RND_PRECISION: f32 = 0x1P-22;

var<private> rng: vec4<u32>;

fn next_u32() -> u32 {
    var t = rng.w;
    var s = rng.x;

    t = t ^ (t << 11u);
	t = t ^ (t >> 8u);
    s = s ^ (s >> 19u);

    rng = vec4(t ^ s, rng.xyz);
    return rng.x;
}

fn next() -> f32 {
    let n = (next_u32() + 0x1FFu) >> 10u;
    return f32(n) * RND_PRECISION;
}

fn seedRNG(position: vec2<f32>) {
    var p = vec2<u32>(position);
    var r = p.xyxy * vec4(3u, 7u, 5u, 11u) + vec4(atomicAdd(&clock, 1u));
    r = r + reverseBits(r.yzwx);
    r = r * reverseBits(r.zwxy);
    rng = r + reverseBits(r.wxyz);
}

// ####################################

fn color(
    position: vec3<f32>,
    smoothNormal: vec3<f32>,
    smoothTangent: vec3<f32>,
    baseColor: vec4<f32>,
    metallicRoughness: vec4<f32>,
    emissive: vec4<f32>,
    occlusion: vec4<f32>,
    tsNormal: vec4<f32>,
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

    let smoothTangentY = cross(smoothNormal, smoothTangent);
    let tangentSpace = mat3x3(smoothTangent, smoothTangentY, smoothNormal);
    let normal = normalize(tangentSpace * (tsNormal.xyz - 0.5));

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
    @location(2) tangent: vec3<f32>,
    @location(3) texcoordBaseColor: vec2<f32>,
    @location(4) texcoordMetallicRoughness: vec2<f32>,
    @location(5) texcoordEmissive: vec2<f32>,
    @location(6) texcoordOcclusion: vec2<f32>,
    @location(7) texcoordNormal: vec2<f32>,
};

@vertex
fn v_main(
    @location(0) pos: vec3<f32>, 
    @location(1) normal: vec3<f32>,
    @location(2) tangent: vec3<f32>,
    @location(3) texcoordBaseColor: vec2<f32>,
    @location(4) texcoordMetallicRoughness: vec2<f32>,
    @location(5) texcoordEmissive: vec2<f32>,
    @location(6) texcoordOcclusion: vec2<f32>,
    @location(7) texcoordNormal: vec2<f32>,
) -> VertexOutput {
    let m = uniforms.positionsMat * node.positionsMat;
    let newPos = m * vec4<f32>(pos, 1.0);
    let newNormal = uniforms.normalsMat * node.normalsMat * vec4<f32>(normal, 0.0);
    let newTangent = m * vec4<f32>(tangent, 0.0);
    return VertexOutput(
        uniforms.projectionMat * newPos,
        newPos.xyz,
        newNormal.xyz,
        newTangent.xyz,
        texcoordBaseColor,
        texcoordMetallicRoughness,
        texcoordEmissive,
        texcoordOcclusion,
        texcoordNormal,
    );
}

@fragment
fn f_main(
    @location(0) fragPosition: vec3<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) fragTangent: vec3<f32>,
    @location(3) texcoordBaseColor: vec2<f32>,
    @location(4) texcoordMetallicRoughness: vec2<f32>,
    @location(5) texcoordEmissive: vec2<f32>,
    @location(6) texcoordOcclusion: vec2<f32>,
    @location(7) texcoordNormal: vec2<f32>,
    @builtin(front_facing) frontFacing: bool,
    @builtin(position) position: vec4<f32>,
) -> @location(0) vec4<f32> {
    let t = mat2x3(dpdy(fragPosition), dpdx(fragPosition));
    let normal = normalize(select(
        select(-fragNormal, fragNormal, frontFacing), 
        cross(t[0], t[1]), 
        all(fragNormal == vec3(0.0))
    ));
    let tangent = normalize(select(
        fragTangent, 
        t[0] + t[1], 
        all(fragTangent == vec3(0.0))
    ));
    let baseColor = textureSample(baseColorTexture, baseColorSampler, texcoordBaseColor);
    let metallicRoughness = textureSample(metallicRoughnessTexture, metallicRoughnessSampler, texcoordMetallicRoughness);
    let emissive = textureSample(emissiveTexture, emissiveSampler, texcoordEmissive);
    let occlusion = textureSample(occlusionTexture, occlusionSampler, texcoordOcclusion);
    let tsNormal = textureSample(normalTexture, normalSampler, texcoordNormal);

    seedRNG(position.xy);
    let opacity = baseColor.a * material.baseColorFactor.a;
    let cutoff = select(material.alphaCutoff, next(), material.alphaCutoff > 1.0);
    if (opacity < cutoff) {
        discard;
    }
    
    return color(fragPosition, normal, tangent, baseColor, metallicRoughness, emissive, occlusion, tsNormal);
}
