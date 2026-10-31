in float shade;
in float depth;
                
out vec4 fragColor; 

uniform U_0_0 {
    mat4 matModel;
    mat4 matView;
    mat4 matProjection;
    vec3 lightPosition;
    vec3 color;
    float shininess;
    float twist;
    float fogginess;
};

const vec3 white = vec3(1.0, 1.0, 1.0); 

void main() {
    float fogFactor = exp2(-depth * fogginess / 8.0);
    fragColor = vec4(mix(white, shade * color, fogFactor), 1.0);
}