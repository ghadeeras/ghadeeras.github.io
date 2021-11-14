precision highp float;

attribute vec3 aModelPos;

uniform mat4 mvpMat;

varying vec4 vModelPos;

void main() {
    vModelPos = vec4(aModelPos, 1.0);
    gl_Position = mvpMat * vModelPos; 
}
