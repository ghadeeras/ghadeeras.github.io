const SIZE = 128;
const MAX = SIZE - 1;
const PI = 3.1415926535897932384626433832795;
const TWO_PI = 2.0 * PI;
const STEP = 2.0 / f32(MAX);

@group(0)
@binding(0)
var<storage, read_write> texture: array<array<array<vec2<u32>, SIZE>, SIZE>, SIZE>;

fn to_vec3_f32(v: vec3<u32>) -> vec3<f32> {
    return STEP * vec3<f32>(v) - 1.0;
}

fn pack(v: vec4<f32>) -> vec2<u32> {
    return vec2(pack2x16float(v.xy), pack2x16float(v.zw));
}

fn scalar_field(v: vec3<f32>) -> vec4<f32> {
    let f = cos(TWO_PI * v);
    let d = -TWO_PI * sin(TWO_PI * v);
    return vec4(d.x, d.y, d.z, f.x + f.y + f.z);
}

fn envelope(v: vec3<f32>) -> vec4<f32> {
    let pi_v = PI * v;
    let pi_v2 = pi_v * v;
    let f = (cos(pi_v2) + 1.0) * 0.5;
    let d = -pi_v * sin(pi_v2);
    return vec4(
        d.x * f.y * f.z,
        d.y * f.z * f.x,
        d.z * f.x * f.y,
        f.x * f.y * f.z
    );
}

fn enveloped_field(v: vec3<f32>) -> vec4<f32> {
    let f = scalar_field(v);
    let e = envelope(v);
    return vec4(
        f.x * e.w + e.x * f.w,
        f.y * e.w + e.y * f.w,
        f.z * e.w + e.z * f.w,
        f.w * e.w
    );
}

@compute
@workgroup_size(4, 4, 4)
fn c_main(@builtin(global_invocation_id) global_invocation_id: vec3<u32>) {
    var v = to_vec3_f32(global_invocation_id);
    texture[global_invocation_id.z][global_invocation_id.y][global_invocation_id.x] = pack(enveloped_field(v));
}
