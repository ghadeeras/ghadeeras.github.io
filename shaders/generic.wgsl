struct VertexOutput {
    @builtin(position) projPos: vec4<f32>;
    @location(0) pos: vec3<f32>;
    @location(1) normal: vec3<f32>;
};

struct Uniforms {
    positionsMat: mat4x4<f32>;
    normalsMat: mat4x4<f32>;
    projectionMat: mat4x4<f32>;
    color: vec4<f32>;
    lightPos: vec4<f32>;
    shininess: f32;
    lightRadius: f32;
    fogginess: f32;
};

@group(0)
@binding(0)
var<uniform> uniforms: Uniforms;

fn color(
    fragPosition: vec3<f32>,
    fragNormal: vec3<f32>,
    frontFacing: bool
) -> vec4<f32> {
    var materialColor = uniforms.color.rgb;
    var lightRay = fragPosition - uniforms.lightPos.xyz;

    var viewDir = normalize(fragPosition);
    var normal = normalize(fragNormal);
    var lightDir = normalize(lightRay);

    if (!frontFacing) {
        normal = -normal;
        materialColor = vec3<f32>(1.0) - materialColor;
    }

    var cosLN = -dot(lightDir, normal);
    var diffuse = (cosLN + 1.0) / 2.0;

    var reflection = lightDir + 2.0 * cosLN * normal;

    var cosRP = -dot(viewDir, reflection);
    var specular = pow((cosRP + 1.0) / 2.0, length(lightRay) / uniforms.lightRadius);

    var fogFactor = exp2(fragPosition.z * uniforms.fogginess / 8.0);

    var shade = diffuse * diffuse + specular * uniforms.shininess;
    return vec4<f32>(mix(vec3<f32>(1.0), shade * materialColor, fogFactor), uniforms.color.a);
}

@stage(vertex)
fn v_main(
    @location(0) pos: vec3<f32>, 
    @location(1) normal: vec3<f32>
) -> VertexOutput {
    var newPos = uniforms.positionsMat * vec4<f32>(pos, 1.0);
    var newNormal = uniforms.normalsMat * vec4<f32>(normal, 0.0);
    return VertexOutput(
        uniforms.projectionMat * newPos,
        newPos.xyz,
        newNormal.xyz
    );
}

@stage(fragment)
fn f_main(
    @location(0) pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @builtin(front_facing) frontFacing: bool
) -> @location(0) vec4<f32> {
    return color(pos, normal, frontFacing);
}
