struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) xy: vec2<f32>,
    @location(1) @interpolate(flat) frame: u32,
};

var<private> vertices: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2(-1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
);

@vertex
fn v_main(@builtin(vertex_index) i: u32, @builtin(instance_index) frame: u32) -> Vertex {
    var xy = vertices[i & 3u];
    return Vertex(vec4(xy, 0.0, 1.0), xy, frame);
}

// ----- Fragment Shader ----- //

struct View {
    matrix: mat3x3<f32>,
    position: vec3<f32>,
    focalLength: f32,
    aspectRatio: f32,
    samplesPerPixel: u32,
};

@group(0) @binding(0)
var<storage, read> frameViews: array<View, 256>;

@group(0) @binding(1)
var frames: texture_2d_array<f32>;

@group(0) @binding(2)
var frameNormals: texture_2d<f32>;

@group(0) @binding(3)
var textureSampler: sampler;

fn equalViews(v1: View, v2: View) -> bool {
    return 
        all(v1.position  == v2.position) &
        all(v1.matrix[2] == v2.matrix[2]) &
        all(v1.matrix[1] == v2.matrix[1]);
}

@fragment
fn f_main(vertex: Vertex) -> @location(0) vec4<f32> {
    let n = u32(textureNumLayers(frames));

    let refView = frameViews[vertex.frame];

    let normal = textureLoad(frameNormals, vec2<i32>(vertex.position.xy), i32(0));
    let depth = normal.w;
    let direction = normalize(vec3(vertex.xy.x * refView.aspectRatio, vertex.xy.y, -refView.focalLength));
    let absolutePosition = depth * direction * refView.matrix + refView.position;

    var c = vec3(0.0);
    var w = 0.0;
    for (var j = 0u; j < n; j = j + 1u) {
        let frameView = frameViews[j];
        let sameView = equalViews(refView, frameView);
        let position = frameView.matrix * (absolutePosition - frameView.position);
        let frameDepthPlus1 = length(position) + 1.0;
        let frameXY = position.xy * (-frameView.focalLength / position.z);
        let uv = (frameXY + vec2(frameView.aspectRatio, -1.0)) * vec2(0.5 / frameView.aspectRatio, -0.5);
        let color = textureSample(frames, textureSampler, uv, i32(j));
        let delta = 256.0 * abs(color.a * frameDepthPlus1 - 1.0);
        let dw = select(0.0, 1.0, sameView | ((all(vec2(0.0) <= uv) & all(uv < vec2(1.0))) & (delta <= frameDepthPlus1)));
        c = c + dw * color.rgb;
        w = w + dw;
    };
    c = c / w;
    
    return vec4(sqrt(c), 1.0);
}