#version 300 es

precision highp float;

in vec2 vertex;

out vec2 pos;

void main() {
    pos = vertex;
    gl_Position = vec4(vertex, 0.0, 1);
}