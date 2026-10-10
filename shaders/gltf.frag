#version 300 es

#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

in vec3 fragPosition;
in vec3 fragNormal;

out vec4 fragColor; 

uniform vec4 color;
uniform float shininess;
uniform float metalness;

uniform vec4 lightPosition;

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

// ####################################

const float ambientLight = 0.0625 * 0.0625;

vec4 calc_color(vec3 position, vec3 normal) {
    vec3 view_dir = normalize(-position);
    vec3 light_dir = normalize(lightPosition.xyz);

    Cosines cosines = calc_cosines(normal, view_dir, light_dir);
    vec3 result = brdf(
        color.rgb, 
        metalness, 
        1.0 - shininess, 
        cosines
    ) * cosines.l_n + ambientLight * color.rgb;
    
    return vec4(sqrt(max(result, 0.0)), color.a);
}

void main() {
    fragColor = calc_color(fragPosition, normalize(gl_FrontFacing ? fragNormal: -fragNormal));
}

