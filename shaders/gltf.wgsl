const epsilon = 1.220703125e-4;
const pi = atan2(0.0, -1.0);
const minLightRadius = sin(pi *  0.5 / 180.0);
const maxLightRadius = sin(pi * 15.0 / 180.0);
const dielectricSpecularBase = vec3(0.04);
const ambientLight = 0.0625 * 0.0625;

struct VertexOutput {
    @builtin(position) projPos: vec4<f32>,
    @location(0) pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) texcoordBaseColor: vec2<f32>,
};

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

fn color(
    position: vec3<f32>,
    normal: vec3<f32>,
    baseColor: vec4<f32>,
) -> vec4<f32> {
    let viewDir = normalize(-position);
    let lightDir = normalize(uniforms.lightPos.xyz);
    let lightRadius = mix(minLightRadius, maxLightRadius, uniforms.lightRadius);

    let materialColor = uniforms.material.baseColorFactor * material.baseColorFactor * baseColor;
    let emissiveFactor = uniforms.material.emissiveFactor * material.emissiveFactor;
    let metallicFactor = uniforms.material.metallicFactor * material.metallicFactor;
    let roughnessFactor = uniforms.material.roughnessFactor * material.roughnessFactor;
    let smoothnessFactor = 1.0 / mix(epsilon, 1.0, roughnessFactor);

    let fogFactor = exp2(position.z * uniforms.fogginess / 8.0);

    let cosLN = clamp(dot(lightDir, normal) + lightRadius, 0.0, 1.0);
    let cosVN = max(dot(viewDir, normal), 0.0);
    let reflection = 2.0 * cosVN * normal - viewDir;
    let cosLR = clamp(dot(lightDir, reflection) + lightRadius, 0.0, 1.0);

    let diffuseBase = mix(materialColor.rgb, vec3(0.0), metallicFactor);
    let specularBase = mix(mix(dielectricSpecularBase, materialColor.rgb, metallicFactor), vec3(1.0), pow(1.0 - cosVN, 5.0));
    let specular = pow(cosLR, smoothnessFactor) * (1.0 + smoothnessFactor) * 0.25;
    let color = (cosLN + ambientLight) * diffuseBase + (specular + ambientLight) * specularBase + emissiveFactor;
    let foggedColor = mix(vec3<f32>(ambientLight), color, fogFactor);

    return vec4<f32>(foggedColor, materialColor.a);
}

@vertex
fn v_main(
    @location(0) pos: vec3<f32>, 
    @location(1) normal: vec3<f32>,
    @location(2) texcoordBaseColor: vec2<f32>
) -> VertexOutput {
    let newPos = uniforms.positionsMat * node.positionsMat * vec4<f32>(pos, 1.0);
    let newNormal = uniforms.normalsMat * node.normalsMat * vec4<f32>(normal, 0.0);
    return VertexOutput(
        uniforms.projectionMat * newPos,
        newPos.xyz,
        newNormal.xyz,
        texcoordBaseColor,
    );
}

@fragment
fn f_main(
    @location(0) fragPosition: vec3<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) texcoordBaseColor: vec2<f32>,
    @builtin(front_facing) frontFacing: bool
) -> @location(0) vec4<f32> {
    let normal = normalize(select(
        select(-fragNormal, fragNormal, frontFacing), 
        cross(dpdy(fragPosition), dpdx(fragPosition)), 
        all(fragNormal == vec3(0.0))
    ));
    return color(fragPosition, normal, texcoordToColor(texcoordBaseColor));
}

fn texcoordToColor(coord: vec2f) -> vec4f {
    let c = vec3(
        0.5 + 0.5  *  coord.x, 
        0.5 - 0.25 * (coord.x + coord.y), 
        0.5 + 0.5  *  coord.y, 
    );
    return vec4(c / max(c.x, max(c.y, c.z)), 1.0);
}
