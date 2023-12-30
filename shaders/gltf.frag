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

uniform vec3 lightPosition;
uniform float lightRadius;
uniform float fogginess;

void main() {
    vec3 materialColor = color.rgb;
    vec3 lightRay = -lightPosition;
    
    vec3 viewDir = normalize(fragPosition);
    vec3 normal = normalize(fragNormal);
    vec3 lightDir = normalize(lightRay);
                
    if (!gl_FrontFacing) {
        normal = -normal;
        materialColor = vec3(1.0) - materialColor;
    }
                
    float cosLN = -dot(lightDir, normal);
    float diffuse = (cosLN + 1.0) / 2.0;

    vec3 reflection = lightDir + 2.0 * cosLN * normal;
    
    float cosRP = -dot(reflection, viewDir);
    float specular = pow((cosRP + 1.0) / 2.0, length(lightRay) / lightRadius);
                
    float fogFactor = exp2(fragPosition.z * fogginess / 8.0);

    float shade = diffuse * diffuse + specular * shininess;
    fragColor = vec4(mix(vec3(1.0), shade * materialColor, fogFactor), color.a);
}