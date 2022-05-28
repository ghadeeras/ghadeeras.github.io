struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

var<private> vertices: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2(-1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
);

fn toUV(xy: vec2<f32>) -> vec2<f32> {
    return (xy + vec2(1.0, -1.0)) * vec2(0.5, -0.5); 
}

@stage(vertex)
fn v_main(@builtin(vertex_index) i: u32) -> Vertex {
    var xy = vertices[i & 3u];
    return Vertex(vec4(xy, 0.0, 1.0), toUV(xy));
}

// ----- Fragment Shader ----- //

@group(0) @binding(0)
var textureLayers: texture_2d_array<f32>;

@group(0) @binding(1)
var textureSampler: sampler;

@stage(fragment)
fn f_main(vertex: Vertex) -> @location(0) vec4<f32> {
    var c = vec3(0.0);
    var n = textureNumLayers(textureLayers);
    for (var j = 0; j < n; j = j + 1) {
        c = c + textureSample(textureLayers, textureSampler, vertex.uv, j).xyz;
    };
    c = c / f32(n);
    
    return vec4(c, 1.0);
}