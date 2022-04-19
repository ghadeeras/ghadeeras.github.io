var<private> vertices: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2(-1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
);

@stage(vertex)
fn v_main(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
    return vec4(vertices[i & 3u], 0.0, 1.0);
}

struct Uniforms {
    randomSeed: vec4<u32>;
    canvasWidth: u32;
    sampleCount: u32;
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

var<private> rng: vec4<u32>;

fn next_u32() -> u32 {
    var t = rng.w;
    var s = rng.x;

    t = t ^ (t << 11u);
	t = t ^ (t >> 8u);
    s = s ^ (s >> 19u);

    var result = t ^ s;
    rng = vec4(result, rng.xyz);
    return result;
}

fn next_unorm() -> f32 {
    var n = (next_u32() + 0x1FFu) >> 10u;
    return f32(n) / 0x3FFFFF.0;
}

fn newRNG(position: vec2<f32>) -> vec4<u32> {
    var p = vec2<u32>(position);
    rng = vec4(p, p) + vec4(3u, 5u, 7u, 11u);
    next_u32();
    next_u32();
    next_u32();
    next_u32();
    return uniforms.randomSeed * rng;
}

@stage(fragment)
fn f_main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    rng = newRNG(position.xy);
    
    var c = vec4(next_unorm(), next_unorm(), next_unorm(), 1.0);
    for (var j = 1; j < 64; j = j + 1) {
        c = c + vec4(next_unorm(), next_unorm(), next_unorm(), 1.0);
    };
    c = c / c.w;
    
    return c;
}