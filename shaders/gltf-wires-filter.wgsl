const filterWidth = 2;
const sampleCount = f32((2 * filterWidth + 1) * (2 * filterWidth + 1));

struct Uniforms {
    positionsMat: mat4x4<f32>,
    normalsMat: mat4x4<f32>,
    projectionMat: mat4x4<f32>,
};

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

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@vertex
fn v_main(@builtin(vertex_index) i: u32) -> Vertex {
    let aspectRatio = uniforms.projectionMat[1][1] / uniforms.projectionMat[0][0];
    let xy = vertices[i & 3u];
    return Vertex(vec4(xy, 0.0, 1.0), xy * vec2(aspectRatio, 1.0));
}

// ----- Fragment Shader ----- //

@group(0) @binding(1)
var normalsTexture: texture_2d<f32>;

var<private> focalLength: f32;

struct Sample {
    normal: vec3<f32>,
    position: vec3<f32>
};

fn calculateFocalLength() -> f32 {
    let scaleX = uniforms.projectionMat[0][0];
    let scaleY = uniforms.projectionMat[1][1];
    return max(scaleX, scaleY);
}

fn loadSample(xy: vec2<i32>, pos: vec2<f32>) -> Sample {
    let t = textureLoad(normalsTexture, xy, i32(0));
    let n = t.xyz;
    let p = t.w * vec3(pos, -focalLength);
    return Sample(n, p);
}

@fragment
fn f_main(vertex: Vertex) -> @location(0) vec4<f32> {
    focalLength = calculateFocalLength(); 
    let maxXY = vec2<i32>(textureDimensions(normalsTexture)) - 1;
    let pixelSize = vec2(dpdx(vertex.pos.x), dpdy(vertex.pos.y));
    let xy = vec2<i32>(vertex.position.xy);
    let refSample = loadSample(xy, vertex.pos);
    let factor = 1.0 / (pixelSize.x * refSample.position.z);
    var sameNormal = 0.0;
    var samePlane = 0.0;
    for (var i = -filterWidth; i <= filterWidth; i = i + 1) {
        for (var j = -filterWidth; j <= filterWidth; j = j + 1) {
            let sXY = xy + vec2(i, j);
            let sPos = vertex.pos + pixelSize * vec2(f32(i), f32(j)); 
            let s = loadSample(sXY, sPos);
            let normalDot = 0.5 * (1.0 + dot(s.normal, refSample.normal));
            sameNormal += normalDot * normalDot;
            let distance = factor * dot(s.position - refSample.position, refSample.normal);
            samePlane += exp(-distance * distance);
        }
    }
    sameNormal /= sampleCount;
    samePlane /= sampleCount;
    return vec4(1.0) * pow(sameNormal * samePlane, 2.0);
}