#version 300 es

#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

in float shade;
in float depth;
                
out vec4 fragColor; 

uniform vec3 color;
uniform float fogginess;

const vec3 white = vec3(1.0, 1.0, 1.0); 

void main() {
    float fogFactor = exp2(-depth * fogginess / 8.0);
    fragColor = vec4(mix(white, shade * color, fogFactor), 1.0);
}