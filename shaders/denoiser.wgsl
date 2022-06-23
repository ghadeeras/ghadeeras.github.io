let filterWidth = 3;
let aspectRatio = 1.0;
let focalLength = 1.4142135623730950488016887242097;

struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) pos: vec2<f32>,
};

var<private> vertices: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2(-1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
);

@stage(vertex)
fn v_main(@builtin(vertex_index) i: u32) -> Vertex {
    let xy = vertices[i & 3u];
    return Vertex(vec4(xy, 0.0, 1.0), xy * vec2(aspectRatio, 1.0));
}

// ----- Fragment Shader ----- //

@group(0) @binding(0)
var colorsTexture: texture_2d<f32>;

@group(0) @binding(1)
var normalsTexture: texture_2d<f32>;

struct Sample {
    color: vec3<f32>;
    normal: vec3<f32>;
    position: vec3<f32>;
};

fn loadSample(xy: vec2<i32>, pos: vec2<f32>) -> Sample {
    let c = textureLoad(colorsTexture, xy, i32(0));
    let n = textureLoad(normalsTexture, xy, i32(0));
    let p = n.w * 128.0 * vec3(pos, -focalLength);
    return Sample(c.rgb, 2.0 * (n.xyz - 0.5), p);
}

fn weightOf(sample: Sample, ref: Sample, pixelSize: f32) -> f32 {
    let coplanarity = pow(dot(sample.normal, ref.normal), 2.0);
    let proximity = 16.0 * pixelSize / length(sample.position - ref.position);
    return coplanarity * proximity;
}

@stage(fragment)
fn f_main(vertex: Vertex) -> @location(0) vec4<f32> {
    let maxXY = textureDimensions(colorsTexture) - 1;
    let pixelSize = -dpdy(vertex.pos.y);
    let xy = vec2<i32>(vertex.position.xy);
    let ref = loadSample(xy, vertex.pos);
    var weight = 0.0;
    var color = vec3(0.0);
    for (var i = -filterWidth; i <= filterWidth; i = i + 1) {
        for (var j = -filterWidth; j <= filterWidth; j = j + 1) {
            if (i == 0 && j == 0) {
                continue;
            }
            let sXY = abs(maxXY - abs(maxXY - xy - vec2(i, j)));
            let sPos = vertex.pos + pixelSize * vec2<f32>(sXY - xy); 
            let s = loadSample(sXY, sPos);
            let w = weightOf(s, ref, pixelSize);
            weight = weight + w;
            color = color + w * s.color;
        }
    }
    color = color / weight;
    let diff = abs(color - ref.color);
    let maxDiff = max(diff.r, max(diff.g, diff.b));
    return vec4(mix(ref.color, color, sqrt(maxDiff)), 1.0);
}