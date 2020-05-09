precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform vec3 lightPosition;
                
uniform mat4 matModel;
uniform mat4 matSubModel;
uniform mat4 matView;
uniform mat4 matProjection;

uniform float shininess;

varying float shade;
varying float depth;
                
void main() {
    mat4 matModelView = matView * matModel * matSubModel;

    vec4 viewedPosition = matModelView * vec4(position, 1.0);
    vec3 viewedNormal = normalize((matModelView * vec4(normal, 0.0)).xyz);
    vec4 viewedLightPosition = matView * vec4(lightPosition, 1);
    vec3 viewedLightDirection = normalize(viewedLightPosition.xyz - viewedPosition.xyz);
    vec3 viewedCameraDirection = -normalize(viewedPosition.xyz);
                
    float cosLN = dot(viewedLightDirection, viewedNormal);
    vec3 viewedReflection = 2.0 * cosLN * viewedNormal - viewedLightDirection;
    float cosRP = dot(viewedReflection, viewedCameraDirection);
    float diffuse = (cosLN + 1.0) / 2.0;
    diffuse *= diffuse;
    float shine = clamp(cosRP, 0.0, 1.0);
    shine = pow(shine, 8.0);
                
    shade = diffuse + shine * shininess;
    depth = length(viewedPosition) + length(viewedPosition - viewedLightPosition);
    gl_Position = matProjection * viewedPosition;
}