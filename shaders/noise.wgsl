var<private> vertices: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
);

@stage(vertex)
fn v_main(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
    return vec4<f32>(vertices[i & 3u], 0.0, 1.0);
}

struct RNG {
    seed: array<u32, 5>;
    counter: u32;
};

struct Canvas {
    width: u32;
    sampleCount: u32;
};

@group(0) @binding(0)
var<uniform> canvas: Canvas;

@group(0) @binding(1)
var<storage, read_write> rngs: array<RNG>;

var <private> rng: RNG;

fn next_u32() -> u32 {
    var t = rng.seed[4];
    rng.seed[4] = rng.seed[3]; 
    rng.seed[3] = rng.seed[2]; 
    rng.seed[2] = rng.seed[1]; 
    rng.seed[1] = rng.seed[0];
    var s = rng.seed[0];

    t = t ^ (t >> 2u);
    t = t ^ (t << 1u);
    t = t ^ (s ^ (s << 4u));

    rng.seed[0] = t;
    rng.counter = rng.counter + 362437u;
    return t + rng.counter;
}

fn next_unorm() -> f32 {
    var n = next_u32();
    return f32(n >> 10u) / 0x3FFFFF.0;
}

@stage(fragment)
fn f_main(
    @builtin(position) position: vec4<f32>,
    @builtin(sample_index) sampleIndex: u32
) -> @location(0) vec4<f32> {
    var p = vec2<u32>(position.xy);
    var i = (((p.y * canvas.width + p.x) * canvas.sampleCount) + sampleIndex) % arrayLength(&rngs);
    rng = rngs[i];
    
    var c = vec4<f32>(next_unorm(), next_unorm(), next_unorm(), 1.0);
    for (var j = 0; j < 256; j = j + 1) {
        c = c + vec4<f32>(next_unorm(), next_unorm(), next_unorm(), 1.0);
    };
    c = c / c.w;
    
    rngs[i] = rng;
    return c;
}