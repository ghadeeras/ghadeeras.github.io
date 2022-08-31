struct VertexOutput {
    @builtin(position) projPos: vec4<f32>,
    @location(0) modelPos: vec4<f32>,
};

struct Uniforms {
    mvpMat: mat4x4<f32>,
};

@group(0)
@binding(0)
var<uniform> uniforms: Uniforms;

var<private> zero: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
var<private> one: vec4<f32> = vec4<f32>(1.0, 1.0, 1.0, 1.0);

@vertex
fn v_main(
    @location(0) pos: vec3<f32>
) -> VertexOutput {
    var modelPos = vec4<f32>(pos, 1.0);
    var projPos = uniforms.mvpMat * modelPos; 
    return VertexOutput(projPos, modelPos);
}

@fragment
fn f_main(
    @location(0) pos: vec4<f32>
) -> @location(0) vec4<f32> {
    return clamp((pos + one) / 2.0, zero, one);
}
