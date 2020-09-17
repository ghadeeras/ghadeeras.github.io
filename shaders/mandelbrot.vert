precision highp float;

attribute vec2 vertex;

varying vec2 pos;

void main() {
    pos = vertex;
    gl_Position = vec4(vertex, 0.0, 1);
}