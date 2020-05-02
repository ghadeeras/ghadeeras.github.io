#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

varying float shade;
                
uniform vec3 color;

void main() {
    gl_FragColor = vec4(abs(shade) * (sign(shade) * color + vec3(1.0)) / 2.0, 1.0);
}