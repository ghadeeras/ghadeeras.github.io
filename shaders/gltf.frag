#version 300 es

#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

in vec3 fragPosition;
in vec3 fragNormal;

out vec4 fragColor; 

uniform vec4 color;
uniform float shininess;
uniform float metalness;

uniform vec3 lightPosition;

void main() {
    vec3 materialColor = color.rgb;
    vec3 lightRay = -lightPosition;
    
    vec3 viewDir = normalize(fragPosition);
    vec3 normal = normalize(fragNormal);
    vec3 lightDir = normalize(lightRay);
                
    if (!gl_FrontFacing) {
        normal = -normal;
    }
                
    float cosLN = -dot(lightDir, normal);
    float diffuse = max(cosLN, 0.0);

    vec3 reflection = lightDir + 2.0 * cosLN * normal;
    
    float cosRP = -dot(reflection, viewDir);
    float specular = pow((cosRP + 1.0) / 2.0, 1.0 / (1.0625 - shininess));
                
    float shade = (diffuse * diffuse * (1.0625 - metalness) + specular * (shininess + 0.0625)) / (1.125 + shininess - metalness);
    fragColor = vec4(shade * materialColor, color.a);
}