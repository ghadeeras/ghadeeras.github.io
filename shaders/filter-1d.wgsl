const HORIZONTAL=0u;
const VERTICAL=1u;

@group(0) @binding(0)
var<storage, read> filterWeights: array<f32>;

@group(1) @binding(0)
var<uniform> direction: u32;

@group(1) @binding(1)
var sourceTexture: texture_2d<f32>;

@group(1) @binding(2)
var targetTexture: texture_storage_2d<rgba16float, write>;

fn colorAt(xy: vec2<u32>) -> vec3<f32> {
    let color = textureLoad(sourceTexture, xy, 0).xyz;
    return select(vec3(1024.0), color, color < vec3(1024.0)); // avoid infinities and/or NaNs
}

@compute
@workgroup_size([[workgroup_size_x]], [[workgroup_size_y]], 1)
fn c_main(@builtin(global_invocation_id) global_invocation_id: vec3<u32>) {
    let dims = min(textureDimensions(sourceTexture), textureDimensions(targetTexture));
    let xy = global_invocation_id.xy;
    if (any(xy >= dims)) {
        return;
    }

    let filter_half_size = arrayLength(&filterWeights);
    let inc = select(vec2(0u, 1u), vec2(1u, 0u), direction == HORIZONTAL);  

    var coords = xy;
    var mirrorCoords = xy;
    var color = filterWeights[0] * colorAt(xy);
    color = select(vec3(1.0), color, color < vec3(1.0)); 
    for (var i = 1u; i < filter_half_size; i++) {
        coords += inc;
        mirrorCoords -= inc;
        color += filterWeights[i] * (
            select(vec3(0.0), colorAt(coords), all(coords < dims)) +
            select(vec3(0.0), colorAt(mirrorCoords), all(mirrorCoords < dims))
        );
    }
    textureStore(targetTexture, xy, vec4(color, 1.0));
}