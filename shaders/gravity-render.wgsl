struct Varyings {
    [[builtin(position)]] position: vec4<f32>;
    [[location(0)]] color: vec3<f32>;
};

[[block]]
struct Uniforms {
    mvpMatrix: mat4x4<f32>;
    radiusScale: f32;
};

[[group(0), binding(0)]]
var<uniform> uniforms: Uniforms;

var<private> lightDir: vec3<f32> = vec3<f32>(1.0, -1.0, 1.0);

[[stage(vertex)]]
fn v_main(
    [[location(0)]] bodyDesc: vec2<f32>,
    [[location(1)]] bodyPosition: vec3<f32>,
    [[location(2)]] pointPosition: vec3<f32>
) -> Varyings {
    var normal = normalize(pointPosition); // assuming sphere

    var mass = bodyDesc.x;
    var radius = 1.0 - exp2(-8.0 * bodyDesc.y);

    var absolutePosition = uniforms.radiusScale * radius * pointPosition + bodyPosition;
    var projectedPosition = uniforms.mvpMatrix * vec4<f32>(absolutePosition, 1.0);

    var shade = (1.0 - dot(normal, normalize(lightDir))) / 2.0;
    var coldness = exp2(-mass);
    var color = vec3<f32>(1.0 - coldness, 0.0, coldness) * shade * shade;

    return Varyings(projectedPosition, color); 
}

[[stage(fragment)]]
fn f_main(varyings: Varyings) -> [[location(0)]] vec4<f32> {
    return vec4<f32>(varyings.color, 1.0);
}
