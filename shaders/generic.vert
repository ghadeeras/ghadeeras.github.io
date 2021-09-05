precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 positionsMat;
uniform mat4 normalsMat;
uniform mat4 projectionMat;

varying vec3 fragPosition;
varying vec3 fragNormal;

void main() {
    fragPosition = (positionsMat * vec4(position, 1.0)).xyz;
    fragNormal = (normalsMat * vec4(normal, 0.0)).xyz;

    gl_Position = projectionMat * vec4(fragPosition, 1.0);
}