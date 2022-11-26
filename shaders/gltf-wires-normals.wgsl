struct VertexOutput {
    @builtin(position) projPos: vec4<f32>,
    @location(0) pos: vec3<f32>,
};

struct Uniforms {
    positionsMat: mat4x4<f32>,
    normalsMat: mat4x4<f32>,
    projectionMat: mat4x4<f32>,
};

struct Node {
    positionsMat: mat4x4<f32>,
    normalsMat: mat4x4<f32>,
}

@group(0)
@binding(0)
var<uniform> uniforms: Uniforms;

@group(1)
@binding(0)
var<uniform> node: Node;

@vertex
fn v_main(
    @location(0) pos: vec3<f32>, 
) -> VertexOutput {
    var newPos = uniforms.positionsMat * node.positionsMat * vec4<f32>(pos, 1.0);
    return VertexOutput(
        uniforms.projectionMat * newPos,
        newPos.xyz,
    );
}

@fragment
fn f_main(
    @location(0) pos: vec3<f32>,
) -> @location(0) vec4<f32> {
    let tx = dpdxCoarse(pos);
    let ty = -dpdyCoarse(pos);
    let normal = normalize(cross(tx, ty));
    return vec4(normal, abs(pos.z));
}
