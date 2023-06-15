struct Varyings {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
};

struct Uniforms {
    mvpMatrix: mat4x4<f32>,
    mvMatrix: mat4x4<f32>,
    mMatrix: mat4x4<f32>,
    radiusScale: f32,
};

@group(0)
@binding(0)
var<uniform> uniforms: Uniforms;

@vertex
fn v_main(
    @location(0) bodyDesc: vec2<f32>,
    @location(1) bodyPosition: vec3<f32>
) -> Varyings {
    let mass = bodyDesc.x;
    let radius = 16.0 * uniforms.radiusScale *  (1.0 - exp2(-4.0 * bodyDesc.y));

    let position = vec4<f32>(bodyPosition, 1.0);
    let relativePosition = uniforms.mvMatrix * position;
    let projectedPosition = uniforms.mvpMatrix * position;

    let shade = 1024.0 * radius * radius / dot(relativePosition, relativePosition);
    let coldness = exp2(-mass);
    let hotness = 1.0 - coldness;
    let f = max(coldness, hotness);
    let color = vec3<f32>(coldness, 0.5, hotness) * shade / f;

    return Varyings(projectedPosition, color); 
}

@fragment
fn f_main(varyings: Varyings) -> @location(0) vec4<f32> {
    return vec4<f32>(varyings.color, 1.0);
}
