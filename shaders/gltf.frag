in vec3 fragPosition;
in vec3 fragNormal;
in vec3 fragTangent;
in vec2 fragCoordBaseColor;
in vec2 fragCoordMetallicRoughness;
in vec2 fragCoordEmissive;
in vec2 fragCoordOcclusion;
in vec2 fragCoordNormal;
in vec3 lightDirection;

out vec4 fragColor; 

uniform U_0_0 {
    mat4 globalPositionsMat;
    mat4 globalNormalsMat;
    mat4 projectionMat;
    vec4 lightPosition;
    vec4 color;
    float metalness;
    float roughness;
    vec3 emissive_factor;
    float alpha_cutoff;
};

uniform U_0_1 {
    uint clock; 
};

uniform U_2_0 {
    vec4 color;
    float metalness;
    float roughness;
    vec2 gap;
    vec3 emissive_factor;
    float alpha_cutoff;
} material;

uniform sampler2D base_color_texture_2_1_2_2;
uniform sampler2D metallic_roughness_texture_2_3_2_4;
uniform sampler2D emissive_factor_texture_2_5_2_6;
uniform sampler2D occlusion_texture_2_7_2_8;
uniform sampler2D normal_texture_2_9_2_10;

// ####################################
// Physically based rendering GGX routines (Cook-Torrance Reflectance Model). See: https://graphicscompendium.com/references/cook-torrance

const float PI = 4.0 * atan(1.0);
const vec3 dielectric_base_color = vec3(0.04);
const float min_roughness = 0.0625;

struct Cosines {
  float v_n;
  float l_n;
  float h_n;
  float v_h;
};

Cosines calc_cosines(vec3 n, vec3 v, vec3 l) {
  vec3 h = normalize(v + l);
  return Cosines(
    max(dot(v, n), 0.0),
    max(dot(l, n), 0.0),
    max(dot(h, n), 0.0),
    max(dot(v, h), 0.0)
  );
}

vec3 fresnel_reflectance(float v_h, vec3 f_0) {
  return f_0 + (1.0 - f_0) * pow(1.0 - v_h, 5.0);
}

float normal_distribution(float h_n, float alpha /* = roughness ^ 2 */) {
  float a_2 = alpha * alpha;
  float d = h_n * h_n * (a_2 - 1.0) + 1.0;
  return a_2 / (d * d);
}

float geometric_attenuation(float l_n, float v_n, float alpha /* = roughness ^ 2 */) {
  float a_2 = alpha * alpha;
  float d_v = v_n + sqrt(mix(v_n * v_n, 1.0, a_2));
  float d_l = l_n + sqrt(mix(l_n * l_n, 1.0, a_2));
  return 1.0 / (d_v * d_l);
}

vec3 brdf(vec3 base_color, float metallic, float roughness, Cosines cosines) {
  float safe_roughness = mix(min_roughness, 1.0, roughness);
  float alpha = safe_roughness * safe_roughness;

  vec3 f_0 = mix(dielectric_base_color, base_color, metallic);
  vec3 reflectance = fresnel_reflectance(cosines.v_h, f_0);
  vec3 absorption = 1.0 - reflectance;
  vec3 diffusion = (1.0 - metallic) * base_color; 

  vec3 specular = reflectance 
    * normal_distribution(cosines.h_n, alpha) 
    * geometric_attenuation(cosines.l_n, cosines.v_n, alpha);
  vec3 diffuse = absorption * diffusion;
  return diffuse + specular;
}

vec3 calcMicroNormal(vec3 macro_normal, vec3 macro_tangent_x, vec3 tsNormal) {
    vec3 macro_tangent_y = cross(macro_normal, macro_tangent_x);
    mat3 tangent_space = mat3(macro_tangent_x, macro_tangent_y, macro_normal);
    return normalize(tangent_space * (tsNormal.xyz - 127.0 / 255.0));
}


// ####################################

const float ambientLight = 0.0625 * 0.0625;

vec4 calc_color(vec3 position, vec3 normal, vec3 tangent, vec4 tex_base_color_factor) {
    vec3 view_dir = normalize(-position);
    vec3 light_dir = normalize(lightDirection);

    vec4 tex_metallic_roughness = texture(metallic_roughness_texture_2_3_2_4, fragCoordMetallicRoughness);
    vec4 tex_emissive_factor = texture(emissive_factor_texture_2_5_2_6, fragCoordEmissive);
    vec4 tex_occlusion = texture(occlusion_texture_2_7_2_8, fragCoordOcclusion);
    vec4 tex_sampled_normal = texture(normal_texture_2_9_2_10, fragCoordNormal);

    vec3 microNormal = calcMicroNormal(normal, tangent, tex_sampled_normal.xyz);

    Cosines cosines = calc_cosines(microNormal, view_dir, light_dir);
    vec3 result = (brdf(
        color.rgb * material.color.rgb * tex_base_color_factor.rgb, 
        metalness * material.metalness * tex_metallic_roughness.b, 
        roughness * material.roughness * tex_metallic_roughness.g, 
        cosines
    ) * cosines.l_n + ambientLight * color.rgb) * tex_occlusion.r + emissive_factor * material.emissive_factor * tex_emissive_factor.rgb;
    
    return vec4(result, color.a);
}

// ####################################
// Pseudo Random Generation ... The xorshift128 PRNG algorithm. See: https://en.wikipedia.org/wiki/Xorshift

const float RND_PRECISION = exp2(-22.0);

uvec4 rng;

uint next_u32() {
    uint t = rng.w;
    uint s = rng.x;

    t = t ^ (t << 11u);
	  t = t ^ (t >> 8u);
    s = s ^ (s >> 19u);

    rng = uvec4(t ^ s, rng.xyz);
    return rng.x;
}

float next() {
    uint n = (next_u32() + 0x1FFu) >> 10u;
    return float(n) * RND_PRECISION;
}

void seedRNG(vec3 position) {
    uvec3 p = floatBitsToUint(position);
    rng = (p.xyzx * p.yzxy + p.zxyz * uvec4(3u, 5u, 7u, 11u)) | uvec4(23u, 19u, 17u, 13u) * clock;
    next(); next(); next(); next();
}

// ####################################

vec3 srgb(vec3 color) {
    vec3 c = max(color, 0.0); 
    return mix(
        c * 12.92,
        1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
        step(vec3(0.0031308), c)
    );
}

float lightGlow(vec3 lightPos, vec3 pos) {
    float dist = length(pos);
    vec3 viewDir = pos / dist;
    float projection = dot(lightPos, viewDir);
    vec3 closestToLight = clamp(projection, 0.0, dist) * viewDir; 
    vec3 diff = lightPos - closestToLight;
    return exp(-256.0 * dot(diff, diff));
}

void main() {
    vec4 tex_base_color_factor = texture(base_color_texture_2_1_2_2, fragCoordBaseColor);

    // Begin: Transparency Hack
    seedRNG(fragPosition); 
    float opacity = tex_base_color_factor.a * material.color.a;
    float cutoff = material.alpha_cutoff > 1.0 ? next() : material.alpha_cutoff;
    if (opacity < cutoff) {
        discard;
    }
    // End: Transparency Hack

    // Begin: Normal?tangent Defaulting
    vec3 gradX = dFdx(fragPosition);
    vec3 gradY = dFdy(fragPosition);
    vec3 normal = normalize(fragNormal != vec3(0.0)
        ? gl_FrontFacing ? fragNormal : -fragNormal
        : cross(gradX, gradY)
    );
    vec3 tangent = normalize(fragTangent == vec3(0.0)
        ? gradX + gradY
        : fragTangent
    );
    // End: Normal/Tangent Defaulting

    vec4 c = calc_color(fragPosition, normal, tangent, tex_base_color_factor);

    float glow = lightPosition.w * lightGlow(lightPosition.xyz, fragPosition);
    c = glow + c * (1.0 - glow);

    float dither = (next() - 0.5) / 128.0;
    fragColor = vec4(srgb(c.rgb + dither), c.a);
}

