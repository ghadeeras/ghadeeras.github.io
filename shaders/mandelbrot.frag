#version 300 es

#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

in vec2 pos;

out vec4 fragColor; 

uniform vec2 center;
uniform float scale;
uniform vec2 color;
uniform float intensity;
uniform float palette;
uniform vec3 juliaNumber;

const float PI = atan(0.0, -1.0);

const float colorAngle = 2.0 * PI / 3.0;

const vec2 redVec = vec2(1.0, 0.0);
const vec2 greenVec = vec2(cos(colorAngle), sin(colorAngle));
const vec2 blueVec = vec2(greenVec.x, -greenVec.y);

const vec3 white = vec3(1.0);

float component(in vec2 v, in vec2 c) {
    return (dot(v, c) + 1.0) / 2.0;
}

vec3 rgbColor() {
    float hue = PI * color.x;
    float saturation = color.y;
    vec2 c = vec2(cos(hue), sin(hue));
    return mix(
        white, 
        vec3(
            component(c, redVec), 
            component(c, greenVec), 
            component(c, blueVec)
        ), 
        saturation
    );
}

vec2 mul(in vec2 c1, in vec2 c2) {
    return vec2(
        c1.x * c2.x - c1.y * c2.y,
        c1.x * c2.y + c1.y * c2.x
    );
}

float mandelbrot(in vec2 c, in vec2 z) {
    for (int i = 0; i < 1024; i++) {
        z = mul(z, z) + c;
        float l = length(z);
        if (l > 2.0) {
            float a = (32.0 * intensity + 1.0) * PI * float(i) / 1024.0;
            return mix((cos(a) + 1.0) / 2.0, exp(-a), palette);
        }
    }
    return 0.0;
}

float mandelbrotOrJulia(in vec2 p) {
    return juliaNumber.z != 0.0 ?
        mandelbrot(juliaNumber.xy, 2.0 * p) :
        mandelbrot(scale * p + center, vec2(0.0));
}

void main() {
    vec3 color = rgbColor();
    fragColor = vec4(mandelbrotOrJulia(pos.xy) * color, 1.0);
}