#version 300 es

#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

in vec3 direction;
out vec4 fragColor; 

uniform vec4 lightPosition;

void main() {
    vec3 view_dir = normalize(direction);
    vec3 light_dir = normalize(lightPosition.xyz);
    float glow = pow(0.5 * dot(view_dir, light_dir) + 0.5, 64.0);

    // seedRNG(gl_PointCoord.xy);
    // float dither = (next() - 0.5) / 128.0;
    float dither = 0.0;

    fragColor = vec4(vec3(glow + dither), 1.0);
}
