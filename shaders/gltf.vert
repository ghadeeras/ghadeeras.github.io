layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec3 tangent;
layout(location = 3) in vec2 coordBaseColor;
layout(location = 4) in vec2 coordMetallicRoughness;
layout(location = 5) in vec2 coordEmissive;
layout(location = 6) in vec2 coordOcclusion;
layout(location = 7) in vec2 coordNormal;

uniform U_0_0 {
    mat4 globalPositionsMat;
    mat4 globalNormalsMat;
    mat4 projectionMat;
    vec4 lightPosition;
    vec4 color;
    float metalness;
    float roughness;
    vec3 emissive_factor;
    float alpha_cutoff;
};

uniform U_1_0 {
    mat4 positionsMat;
    mat4 normalsMat;
};

out vec3 fragPosition;
out vec3 fragNormal;
out vec3 fragTangent;
out vec2 fragCoordBaseColor;
out vec2 fragCoordMetallicRoughness;
out vec2 fragCoordEmissive;
out vec2 fragCoordOcclusion;
out vec2 fragCoordNormal;
out vec3 lightDirection;

void main() {
    mat4 m = globalPositionsMat * positionsMat;
    fragPosition = (m * vec4(position, 1.0)).xyz;
    fragNormal = (globalNormalsMat * normalsMat * vec4(normal, 0.0)).xyz;
    fragTangent = (m * vec4(tangent, 0.0)).xyz;
    fragCoordBaseColor = coordBaseColor;        
    fragCoordMetallicRoughness = coordMetallicRoughness;
    fragCoordEmissive = coordEmissive;         
    fragCoordOcclusion = coordOcclusion;        
    fragCoordNormal = coordNormal;

    lightDirection = lightPosition.xyz - lightPosition.w * fragPosition;

    gl_Position = mat4(
        1, 0,  0, 0,
        0, 1,  0, 0,
        0, 0,  2, 0,
        0, 0, -1, 1
    ) * projectionMat * vec4(fragPosition, 1.0);
}