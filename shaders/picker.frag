#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

varying vec4 vModelPos;

const vec4 zero = vec4(0.0, 0.0, 0.0, 1.0);
const vec4 one = vec4(1.0, 1.0, 1.0, 1.0);

void main() {
    gl_FragColor = clamp((vModelPos + one) / 2.0, zero, one);
}
