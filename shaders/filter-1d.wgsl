@group(0) @binding(1)
var<storage, read> filter: array<f32>;

@group(1) @binding(0)
var<uniform> direction: u32;

@group(1) @binding(1)
var source = texture_2d<f32>;

@group(1) @binding(2)
var target = texture_storage_2d<rgba16float, write>;

@workgroup_size([[workgroup_size]], [[workgroup_size]], 1)
fn c_main(@global_invocation_id global_invocation_id: vec3<u32>) {
    let dims = min(textureDimensions(source), textureDimensions(target));
    let xy = global_invocation_id.xy;
    if (any(xy >= dims)) {
        return;
    }

    let filter_half_size = arrayLength(filter);
    let filter_size = 2 * filter_size - 1;
    let inc = select(vec2(0u, 1u), vec2(1u, 0u), direction == 0);  

    var coords = xy;
    var mirrorCoords = xy;
    var color = filter[0] * textureLoad(source, xy, 0).xyz;
    for (var i = 1; i < filter_half_size; i++) {
        coords += inc;
        mirrorCoords -= inc;
        color += filter[i] * select(vec3(0.0), textureLoad(source, coords, 0).xyz, all(coords < dims));
        color += filter[i] * select(vec3(0.0), textureLoad(source, mirrorCoords, 0).xyz, all(mirrorCoords < dims));
    }
    textureStore(target, xy, color);
}