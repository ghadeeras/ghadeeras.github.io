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

uniform vec2 initialZ;
uniform vec2 center;
uniform float scale;
uniform float colorBias;

const float PI = 3.1415926535897932384626433832795;
const float colorAngle = 2.0 * PI / 3.0;

const vec2 red = vec2(1.0, 0.0);
const vec2 green = vec2(cos(colorAngle), sin(colorAngle));
const vec2 blue = vec2(green.x, -green.y);

vec2 mul(in vec2 c1, in vec2 c2) {
    return vec2(
        c1.x * c2.x - c1.y * c2.y,
        c1.x * c2.y + c1.y * c2.x
    );
}

float comp(in vec2 v, in vec2 c) {
    return (dot(v, c) + 1.0) / 2.0;
}

vec3 color(in vec2 c) {
    vec2 z = initialZ;
    for (int i = 0; i < 1024; i++) {
        z = mul(z, z) + c;
        float l = length(z);
        if (l > 2.0) {
            float a = float(i) * PI / 32.0 + PI * colorBias;
            vec2 v = vec2(cos(a), sin(a));
            return vec3(comp(v, red), comp(v, green), comp(v, blue));
        }
    }
    return vec3(0.0, 0.0, 0.0);
}

void main() {
    float s = 0.75 * pow(1024.0, 0.1 - scale);
    vec2 c = 2.0 * center + vec2(0.75, 0.0);
    fragColor = vec4(color(s * pos.xy - c), 1.0);
}