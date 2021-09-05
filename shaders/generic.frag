#ifdef GL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#endif

varying vec3 fragPosition;
varying vec3 fragNormal;

uniform vec4 color;
uniform float shininess;
uniform float outlineSharpness;

uniform vec3 lightPosition;
uniform float lightRadius;
uniform float fogginess;

void main() {
    vec3 materialColor = color.rgb;
    vec3 lightRay = fragPosition - lightPosition;
    
    vec3 viewDir = normalize(fragPosition);
    vec3 normal = normalize(fragNormal);
    vec3 lightDir = normalize(lightRay);
                
    float facing = -dot(viewDir, normal);
    if (facing < 0.0) {
        normal = -normal;
        materialColor = vec3(1.0) - materialColor;
    }
                
    float cosLN = -dot(lightDir, normal);
    float diffuse = (cosLN + 1.0) / 2.0;

    vec3 reflection = lightDir + 2.0 * cosLN * normal;
    
    float cosRP = -dot(reflection, viewDir);
    float specular = pow((cosRP + 1.0) / 2.0, length(lightRay) / lightRadius) + 0.5;
                
    float outline = 1.0 - pow(1.0 - facing * facing, 1.0 + outlineSharpness * 15.0);
    float fogFactor = exp2(fragPosition.z * fogginess / 8.0);

    float shade = mix(diffuse * diffuse, specular, shininess) * outline;
    gl_FragColor = vec4(mix(vec3(1.0), shade * materialColor, fogFactor), color.a);
}