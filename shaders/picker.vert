#version 300 es

precision highp float;

in vec3 aModelPos;

uniform U_0_0 {
    mat4 mvpMat;
};

out vec4 vModelPos;

void main() {
    vModelPos = vec4(aModelPos, 1.0);
    gl_Position = mvpMat * vModelPos; 
}
