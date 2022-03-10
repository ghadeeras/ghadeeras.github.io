#version 300 es

precision highp float;

in vec3 position;
in vec3 normal;

uniform mat4 positionsMat;
uniform mat4 normalsMat;
uniform mat4 projectionMat;
uniform mat4 modelViewMat;

out vec3 fragPosition;
out vec3 fragNormal;

void main() {
    fragPosition = (modelViewMat * positionsMat * vec4(position, 1.0)).xyz;
    fragNormal = (modelViewMat * normalsMat * vec4(normal, 0.0)).xyz;

    gl_Position = projectionMat * vec4(fragPosition, 1.0);
}