#version 300 es

#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

in vec4 fragColor;
in vec3 fragPosition;
in vec3 fragNormal;
in vec3 fragLightRay;

out vec4 finalFragColor; 

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
    float diffuse = cosLN ;
    float shine = clamp(cosRP, 0.0, 1.0);
    shine = pow(shine, 8.0);
                
    float shade = diffuse + shine;

    finalFragColor = vec4(shade * fragColor.rgb, fragColor.a);
}