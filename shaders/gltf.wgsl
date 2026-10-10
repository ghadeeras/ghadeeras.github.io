struct Uniforms {
    positions_mat: mat4x4<f32>,
    normals_mat: mat4x4<f32>,
    projection_mat: mat4x4<f32>,
    light_pos: vec4<f32>,
    material: Material,
};

struct Node {
    positions_mat: mat4x4<f32>,
    normals_mat: mat4x4<f32>,
}

struct Material {
    base_color_factor: vec4f,
    metallic_factor: f32,
    roughness_factor: f32,
    emissive_factor: vec3f,
    alpha_cutoff: f32,
}

struct Vertex {
    @builtin(position) builtinPos: vec4<f32>,
    @location(0) position: vec3<f32>, 
    @location(1) normal: vec3<f32>,
    @location(2) tangent: vec3<f32>,
    @location(3) texcoord_base_color: vec2<f32>,
    @location(4) texcoord_metallic_roughness: vec2<f32>,
    @location(5) texcoord_emissive_factor: vec2<f32>,
    @location(6) texcoord_occlusion: vec2<f32>,
    @location(7) texcoord_normal: vec2<f32>,
};

@group(0)
@binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1)
var<storage, read_write> clock: atomic<u32>;

@group(1)
@binding(0)
var<uniform> node: Node;

@group(2)
@binding(0)
var<uniform> material: Material;

@group(2)
@binding(1)
var base_color_texture: texture_2d<f32>;

@group(2)
@binding(2)
var base_color_sampler: sampler;

@group(2)
@binding(3)
var metallic_roughness_texture: texture_2d<f32>;

@group(2)
@binding(4)
var metallic_roughness_sampler: sampler;

@group(2)
@binding(5)
var emissive_factor_texture: texture_2d<f32>;

@group(2)
@binding(6)
var emissive_factor_sampler: sampler;

@group(2)
@binding(7)
var occlusion_texture: texture_2d<f32>;

@group(2)
@binding(8)
var occlusion_sampler: sampler;

@group(2)
@binding(9)
var normal_texture: texture_2d<f32>;

@group(2)
@binding(10)
var normal_sampler: sampler;

@vertex
fn v_main(
    @location(0) pos: vec3<f32>, 
    @location(1) normal: vec3<f32>,
    @location(2) tangent: vec3<f32>,
    @location(3) texcoord_base_color: vec2<f32>,
    @location(4) texcoord_metallic_roughness: vec2<f32>,
    @location(5) texcoord_emissive_factor: vec2<f32>,
    @location(6) texcoord_occlusion: vec2<f32>,
    @location(7) texcoord_normal: vec2<f32>,
) -> Vertex {
    let m = uniforms.positions_mat * node.positions_mat;
    let new_pos = m * vec4<f32>(pos, 1.0);
    let new_normal = uniforms.normals_mat * node.normals_mat * vec4<f32>(normal, 0.0);
    let new_tangent = m * vec4<f32>(tangent, 0.0);
    return Vertex(
        uniforms.projection_mat * new_pos,
        new_pos.xyz,
        new_normal.xyz,
        new_tangent.xyz,
        texcoord_base_color,
        texcoord_metallic_roughness,
        texcoord_emissive_factor,
        texcoord_occlusion,
        texcoord_normal,
    );
}

@fragment
fn f_main(
    @builtin(front_facing) front_facing: bool,
    vertex: Vertex,
) -> @location(0) vec4<f32> {
    let base_color_factor = textureSample(base_color_texture, base_color_sampler, vertex.texcoord_base_color);

    // Begin: Transparency Hack
    seedRNG(vertex.builtinPos.xy);
    let opacity = base_color_factor.a * material.base_color_factor.a;
    let cutoff = select(material.alpha_cutoff, next(), material.alpha_cutoff > 1.0);
    if (opacity < cutoff) {
        discard;
    }
    // End: Transparency Hack
    
    
    // Begin: Normal/Tangent Defaulting
    let gradX = dpdx(vertex.position);
    let gradY = dpdy(vertex.position);
    let normal = normalize(select(
        select(-vertex.normal, vertex.normal, front_facing), 
        cross(gradY, gradX), 
        all(vertex.normal == vec3(0.0))
    ));
    let tangent = normalize(select(
        vertex.tangent, 
        gradX + gradY, 
        all(vertex.tangent == vec3(0.0))
    ));
    // End: Normal/Tangent Defaulting

    let metallic_roughness = textureSample(metallic_roughness_texture, metallic_roughness_sampler, vertex.texcoord_metallic_roughness);
    let emissive_factor = textureSample(emissive_factor_texture, emissive_factor_sampler, vertex.texcoord_emissive_factor);
    let occlusion = textureSample(occlusion_texture, occlusion_sampler, vertex.texcoord_occlusion);
    let sampled_normal = textureSample(normal_texture, normal_sampler, vertex.texcoord_normal);

    let dither = vec4((vec3(next(), next(), next()) - 0.5) / 128.0, 0.0);
    return color(vertex.position, normal, tangent, base_color_factor, metallic_roughness, emissive_factor, occlusion, sampled_normal) + dither;
}

// ####################################

const vertices = array(
    vec2(-1.0, -1.0),
    vec2( 3.0, -1.0),
    vec2(-1.0,  3.0),
);

struct SkyPos {
    @builtin(position) clip_position: vec4f,
    @location(0) direction: vec3f,
}

@vertex 
fn v_sky(@builtin(vertex_index) index: u32) -> SkyPos {
    let clip_position = vec4(vertices[index], 0.0, 1.0);
    let scaling = vec2(uniforms.projection_mat[0][0], uniforms.projection_mat[1][1]); 
    let focal_length = max(scaling.x, scaling.y);
    let aspect_ratio = scaling.yx / min(scaling.x, scaling.y);
    return SkyPos(
        clip_position,
        vec3(clip_position.xy * aspect_ratio, -focal_length)
    );
}

@fragment
fn f_sky(sky_pos: SkyPos) -> @location(0) vec4f {
    let view_dir = normalize(sky_pos.direction);
    let light_dir = normalize(uniforms.light_pos.xyz);
    let glow = pow(0.5 * dot(view_dir, light_dir) + 0.5, 64.0);

    seedRNG(sky_pos.clip_position.xy);
    let dither = (next() - 0.5) / 128.0;

    return vec4f(vec3(glow + dither), 1.0);
}

// ####################################

const ambientLight = 0.0625 * 0.0625;

fn color(
    position: vec3<f32>,
    macro_normal: vec3<f32>,
    macro_tangent_x: vec3<f32>,
    base_color_factor: vec4<f32>,
    metallic_roughness: vec4<f32>,
    emissive_factor: vec4<f32>,
    occlusion: vec4<f32>,
    sampled_normal: vec4<f32>,
) -> vec4<f32> {
    let final_base_color_factor = uniforms.material.base_color_factor * material.base_color_factor * base_color_factor;
    let final_emissive_factor = uniforms.material.emissive_factor * material.emissive_factor * emissive_factor.rgb;
    let final_metallic_factor = uniforms.material.metallic_factor * material.metallic_factor * metallic_roughness.b;
    let final_roughness_factor = uniforms.material.roughness_factor * material.roughness_factor * metallic_roughness.g;

    let normal = microNormal(macro_normal, macro_tangent_x, sampled_normal);
    let view_dir = normalize(-position);
    let light_dir = normalize(uniforms.light_pos.xyz);

    let cosines = calc_cosines(normal, view_dir, light_dir);
    let color = 0.0
        + brdf(
            final_base_color_factor.rgb, 
            final_metallic_factor, 
            final_roughness_factor, 
            cosines,
        ) * cosines.l_n * occlusion.r
        + ambientLight * final_base_color_factor.rgb * occlusion.r
        + final_emissive_factor;
    
    return vec4<f32>(color, final_base_color_factor.a);
}

fn microNormal(macro_normal: vec3<f32>, macro_tangent_x: vec3<f32>, tsNormal: vec4<f32>) -> vec3f {
    let macro_tangent_y = cross(macro_normal, macro_tangent_x);
    let tangent_space = mat3x3(macro_tangent_x, macro_tangent_y, macro_normal);
    return normalize(tangent_space * (tsNormal.xyz - 127.0 / 255.0));
}

// ####################################
// Pseudo Random Generation ... The xorshift128 PRNG algorithm. See: https://en.wikipedia.org/wiki/Xorshift

const RND_PRECISION: f32 = 0x1P-22;

var<private> rng: vec4<u32>;

fn next_u32() -> u32 {
    var t = rng.w;
    var s = rng.x;

    t = t ^ (t << 11u);
	t = t ^ (t >> 8u);
    s = s ^ (s >> 19u);

    rng = vec4(t ^ s, rng.xyz);
    return rng.x;
}

fn next() -> f32 {
    let n = (next_u32() + 0x1FFu) >> 10u;
    return f32(n) * RND_PRECISION;
}

fn seedRNG(position: vec2<f32>) {
    var p = vec2<u32>(position);
    var r = p.xyxy * vec4(3u, 7u, 5u, 11u) + vec4(atomicAdd(&clock, 1u));
    r = r + reverseBits(r.yzwx);
    r = r * reverseBits(r.zwxy);
    rng = r + reverseBits(r.wxyz);
}

// ####################################
// Physically based rendering GGX routines (Cook-Torrance Reflectance Model). See: https://graphicscompendium.com/references/cook-torrance

const PI = atan2(0.0, -1.0);
const dielectric_base_color = vec3(0.04);
const min_roughness = 0.0625;

struct Cosines {
  v_n: f32,
  l_n: f32,
  h_n: f32,
  v_h: f32,
}

fn calc_cosines(n: vec3f, v: vec3f, l: vec3f) -> Cosines {
  let h = normalize(v + l);
  return Cosines(
    max(dot(v, n), 0.0),
    max(dot(l, n), 0.0),
    max(dot(h, n), 0.0),
    max(dot(v, h), 0.0)
  );
}

fn brdf(base_color: vec3f, metallic: f32, roughness: f32, cosines: Cosines) -> vec3f {
  let safe_roughness = mix(min_roughness, 1.0, roughness);
  let alpha = safe_roughness * safe_roughness;

  let f_0 = mix(dielectric_base_color, base_color, metallic);
  let reflectance = fresnel_reflectance(cosines.v_h, f_0);
  let absorption = 1.0 - reflectance;
  let diffusion = (1.0 - metallic) * base_color; 

  let specular = reflectance 
    * normal_distribution(cosines.h_n, alpha) 
    * geometric_attenuation(cosines.l_n, cosines.v_n, alpha);
  let diffuse = absorption * diffusion;
  return diffuse + specular;
}

fn fresnel_reflectance(v_h: f32, f_0: vec3f) -> vec3f {
  return f_0 + (1.0 - f_0) * pow(1.0 - v_h, 5.0);
}

fn normal_distribution(h_n: f32, alpha: f32 /* = roughness ^ 2 */) -> f32 {
  let a_2 = alpha * alpha;
  let d = h_n * h_n * (a_2 - 1.0) + 1.0;
  return a_2 / (d * d);
}

fn geometric_attenuation(l_n: f32, v_n: f32, alpha: f32 /* = roughness ^ 2 */) -> f32 {
  let a_2 = alpha * alpha;
  let d_v = v_n + sqrt(mix(v_n * v_n, 1.0, a_2));
  let d_l = l_n + sqrt(mix(l_n * l_n, 1.0, a_2));
  return 1.0 / (d_v * d_l);
}

// ####################################
