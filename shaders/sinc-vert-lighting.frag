#version 300 es

#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

in float shade;
                
out vec4 fragColor; 

uniform vec3 color;

void main() {
    fragColor = vec4(abs(shade) * (sign(shade) * color + vec3(1.0)) / 2.0, 1.0);
}