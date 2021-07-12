#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec3 fragLightRay;
varying float fogDepth;

uniform vec4 color;
uniform float shininess;
uniform float fogginess;

const vec3 white = vec3(1.0, 1.0, 1.0); 

void main() {
    vec3 viewDir = normalize(fragPosition);
    vec3 normal = normalize(fragNormal);
    vec3 lightRay = normalize(fragLightRay);
                
    float facing = -dot(viewDir, normal);
    normal = facing >= 0.0 ? normal : -normal;
                
    float cosLN = -dot(lightRay, normal);
    vec3 reflectionRay = normal * 2.0 * cosLN + lightRay;
    float cosRP = -dot(reflectionRay, viewDir);
    float diffuse = (cosLN + 1.0) / 2.0;
    diffuse *= diffuse;
    float shine = clamp(cosRP, 0.0, 1.0);
    shine = pow(shine, 8.0);
                
    float shade = (diffuse + shine * shininess);

    vec3 c = (color.a >= 0.0 || facing >= 0.0) ? color.rgb : (vec3(1.0) - color.rgb);

    float fogFactor = exp2(-fogDepth * fogginess / 8.0);
    gl_FragColor = vec4(mix(white, shade * c, fogFactor), 1.0);
}