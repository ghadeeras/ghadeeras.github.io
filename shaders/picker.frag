in vec4 vModelPos;

out vec4 fragColor; 

const vec4 zero = vec4(0.0, 0.0, 0.0, 1.0);
const vec4 one = vec4(1.0, 1.0, 1.0, 1.0);

void main() {
    fragColor = clamp((vModelPos + one) / 2.0, zero, one);
}
