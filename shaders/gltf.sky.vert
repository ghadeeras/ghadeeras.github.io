#version 300 es

uniform mat4 projectionMat;

out vec3 direction;

const vec2[3] vertices = vec2[3](
    vec2(-1.0, -1.0),
    vec2( 3.0, -1.0),
    vec2(-1.0,  3.0)
);

void main() {
    vec4 clip_position = vec4(vertices[gl_VertexID], 0.0, 1.0);
    vec2 scaling = vec2(projectionMat[0][0], projectionMat[1][1]); 
    float focal_length = max(scaling.x, scaling.y);
    vec2 aspect_ratio = scaling.yx / min(scaling.x, scaling.y);

    direction = vec3(clip_position.xy * aspect_ratio, -focal_length);
    gl_Position = clip_position;
}
