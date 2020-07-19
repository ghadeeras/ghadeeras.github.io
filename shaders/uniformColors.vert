precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform vec3 lightPosition;
                
uniform mat4 matModel;
uniform mat4 matView;
uniform mat4 matProjection;

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec3 fragLightRay;
varying float fogDepth;

void main() {
    mat4 matModelView = matView * matModel;
    vec3 viewedLightPosition = (matView * vec4(lightPosition, 1.0)).xyz;

    fragPosition = (matModelView * vec4(position, 1.0)).xyz;
    fragNormal = (matModelView * vec4(normal, 0.0)).xyz;
    fragLightRay = fragPosition - viewedLightPosition;
    fogDepth = length(fragPosition) + length(fragLightRay);

    gl_Position = matProjection * vec4(fragPosition, 1.0);
}