const filterWidth = 2;
const sampleCount = f32((2 * filterWidth + 1) * (2 * filterWidth + 1) - 1);
const aspectRatio = 2.0;
const focalLength = 2.0;

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

@vertex
fn v_main(@builtin(vertex_index) i: u32) -> Vertex {
    let xy = vertices[i & 3u];
    return Vertex(vec4(xy, 0.0, 1.0), xy * vec2(aspectRatio, 1.0));
}

// ----- Fragment Shader ----- //

@group(0) @binding(0)
var normalsTexture: texture_2d<f32>;

struct Sample {
    normal: vec3<f32>,
    position: vec3<f32>
};

fn loadSample(xy: vec2<i32>, pos: vec2<f32>) -> Sample {
    let t = textureLoad(normalsTexture, xy, i32(0));
    let n = t.xyz;
    let p = t.w * vec3(pos, -focalLength);
    return Sample(n, p);
}

const threshold = 3.1415926535897932384626433832795 / 3.0;

@fragment
fn f_main(vertex: Vertex) -> @location(0) vec4<f32> {
    let cosThreshold = cos(threshold);
    let sinThreshold = sin(threshold);
    let maxXY = vec2<i32>(textureDimensions(normalsTexture)) - 1;
    let pixelSize = vec2(dpdx(vertex.pos.x), dpdy(vertex.pos.y));
    let xy = vec2<i32>(vertex.position.xy);
    let refSample = loadSample(xy, vertex.pos);
    var sameNormal = 0.0;
    var sameMesh = 0.0;
    for (var i = -filterWidth; i <= filterWidth; i = i + 1) {
        for (var j = -filterWidth; j <= filterWidth; j = j + 1) {
            let sXY = xy + vec2(i, j);
            if (((i | j) == 0) | any(sXY < vec2(0)) | any(sXY > maxXY)) {
                continue;
            }
            let sPos = vertex.pos + pixelSize * vec2(f32(i), f32(j)); 
            let s = loadSample(sXY, sPos);
            let normalDot = dot(s.normal, refSample.normal);
            sameNormal += select(0.0, 1.0, normalDot > cosThreshold);
            let distance = abs(dot(s.position - refSample.position, refSample.normal));
            sameMesh += exp(-distance / pixelSize.x) / sinThreshold;
        }
    }
    sameNormal /= sampleCount;
    sameMesh /= sampleCount;
    return vec4(1.0) * pow(min(sameNormal, sameMesh), 2.0);
}