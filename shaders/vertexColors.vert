in vec3 position;
in vec3 normal;
in vec4 color;

uniform U_0_0 {
    uniform mat4 matModel;
    uniform mat4 matView;
    uniform mat4 matProjection;
    uniform vec3 lightPosition;
};

out vec4 fragColor;
out vec3 fragPosition;
out vec3 fragNormal;
out vec3 fragLightRay;

void main() {
    mat4 matModelView = matView * matModel;
    vec3 viewedLightPosition = (matView * vec4(lightPosition, 1.0)).xyz;

    fragPosition = (matModelView * vec4(position, 1.0)).xyz;
    fragNormal = (matModelView * vec4(normal, 0.0)).xyz;
    fragColor = color;
    fragLightRay = fragPosition - viewedLightPosition;

    gl_Position = mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 2, 0,
        0, 0, -1, 1
    ) * matProjection * vec4(fragPosition, 1.0);
}