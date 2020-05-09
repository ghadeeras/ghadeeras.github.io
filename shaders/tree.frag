#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

varying float shade;
varying float depth;
                
uniform vec3 color;

const vec3 white = vec3(1.0, 1.0, 1.0); 

void main() {
    float fogFactor = exp2(-depth / 32.0);
    gl_FragColor = vec4(mix(white, shade * color, fogFactor), 1.0);
}