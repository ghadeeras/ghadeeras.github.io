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

out vec3 direction;

const vec2[3] vertices = vec2[3](
    vec2(-1.0, -1.0),
    vec2( 3.0, -1.0),
    vec2(-1.0,  3.0)
);

void main() {
    vec4 clip_position = vec4(vertices[gl_VertexID], 0.25, 1.0);

    mat4 m = inverse(mat4(
        1, 0,  0, 0,
        0, 1,  0, 0,
        0, 0,  2, 0,
        0, 0, -1, 1
    ) * projectionMat);
    vec4 d = m * clip_position;
    direction = d.xyz;

    gl_Position = clip_position;
}
