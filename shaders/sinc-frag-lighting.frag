#version 300 es

#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

in vec3 position;
in vec3 normal;
in vec3 lightRay;
                
out vec4 fragColor; 

uniform vec3 color;
uniform float shininess;
                
float adapt(in float x, in float min, in float max) {
    return min + (x + 1.0) * (max - min) / 2.0;
}
                
void main() {
    float s = adapt(shininess, 0.0, 1.0);
    vec3 p = normalize(position);
    vec3 n = normalize(normal);
    vec3 l = normalize(lightRay);
                
    float facing = -dot(p, n);
    facing = facing >= 0.0 ? 1.0 : -1.0;
    n *= facing;
                
    float cosLN = -dot(l, n);
    vec3 r = n * 2.0 * cosLN + l;
    float cosRP = -dot(r, p);
    float diffuse = (cosLN + 1.0) / 2.0;
    diffuse *= diffuse;
    float shine = clamp(cosRP, 0.0, 1.0);
    shine = pow(shine, 8.0);
                
    float shade = diffuse + shine * s;
    fragColor = vec4(shade * (facing * color + vec3(1.0)) / 2.0, 1.0);
}
