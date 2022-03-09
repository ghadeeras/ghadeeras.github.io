#version 300 es

precision highp float;

in vec3 position;
in vec3 normal;

uniform vec3 lightPosition;
                
uniform mat4 matModel;
uniform mat4 matSubModel;
uniform mat4 matView;
uniform mat4 matProjection;

uniform float shininess;

uniform float twist;

out float shade;
out float depth;

const float PI = 3.1415926535897932384626433832795;

void twistMats(in vec4 position, out mat4 twistMat, out mat4 twistMatInvTrans) {
    float r = length(position.zx);
    float c = PI * twist / 4.0;
    float a = c * r; 
    twistMat = mat4(
        +cos(a), 0.0, sin(a), 0.0,
            0.0, 1.0,    0.0, 0.0,
        -sin(a), 0.0, cos(a), 0.0,
            0.0, 0.0,    0.0, 1.0
    );
    float cxzr = r >= 0.001 ? c * position.x * position.z / r : 0.0;
    float cx2r = r >= 0.001 ? c * position.x * position.x / r : 0.0;
    float cz2r = r >= 0.001 ? c * position.z * position.z / r : 0.0;
    twistMatInvTrans = mat4(
        1.0 - cxzr, 0.0,       cz2r, 0.0,
               0.0, 1.0,        0.0, 0.0,
            - cx2r, 0.0, 1.0 + cxzr, 0.0,
               0.0, 0.0,        0.0, 1.0
    );
} 
                
void main() {
    vec4 locPos = matSubModel * vec4(position, 1.0);
    vec4 locNormal = matSubModel * vec4(normal, 0.0);

    mat4 twistMat;
    mat4 twistMatInvTrans;
    twistMats(locPos, twistMat, twistMatInvTrans);

    mat4 matModelView = matView * matModel * twistMat;

    vec4 viewedPosition = matModelView * locPos;
    vec3 viewedNormal = normalize(matModelView * twistMatInvTrans * locNormal).xyz;
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