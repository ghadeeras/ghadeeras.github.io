const SIZE = 128;
const MAX = SIZE - 1;
const PI = 3.1415926535897932384626433832795;
const TWO_PI = 2.0 * PI;
const STEP = 2.0 / f32(MAX);

struct Uniforms {
    matrix: mat3x3<f32>,
    displacement: vec3<f32>,
    scale: f32,
    depth: u32,
};

@group(0)
@binding(0)
var texture: texture_storage_3d<rgba16float, write>;

@group(0)
@binding(1)
var<uniform> uniforms: Uniforms;

fn to_vec3_f32(v: vec3<u32>) -> vec3<f32> {
    return STEP * vec3<f32>(v) - 1.0;
}

fn scalar_field(v: vec3<f32>) -> vec4<f32> {
    return 2.0 * noise(v) - vec4(0.0, 0.0, 0.0, 1.0);
}

fn cosines(v: vec3<f32>) -> vec4<f32> {
    let f = cos(TWO_PI * v);
    let d = -TWO_PI * sin(TWO_PI * v);
    return vec4(d.x, d.y, d.z, f.x + f.y + f.z);
}

fn noise(pos: vec3<f32>) -> vec4<f32> {
    var p = pos;
    var m = uniforms.matrix;
    var s = uniforms.scale;
    let spaceScale =  1.0 / s;
    var result = base(p);
    for (var i = 0u; i < uniforms.depth; i++) {
        p = spaceScale * uniforms.matrix * p + uniforms.displacement;
        let r = base(p);
        result = vec4(result.xyz + r.xyz * m, result.w + s * r.w);
        m *= uniforms.matrix;
        s *= uniforms.scale;
    }
    return result;
}

fn base(v: vec3<f32>) -> vec4<f32> {
    let als = 2.0 * fract(0.5 * v) - 1.0;
    let a = abs(als);
    let s = smoothstep(vec3(0.0), vec3(1.0), a);
    let deriv = 6.0 * als * (1.0 - a);
    let factors = s.yzx * s.zxy;
    let grad = deriv * factors;
    let w = s.x * factors.x;
    return vec4(grad, w);
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
    textureStore(texture, global_invocation_id, enveloped_field(v));
}
