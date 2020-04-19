
module WebGLLab {

    export type ProgramSample = {
        name: string;
        vertexShader: string;
        fragmentShader: string;
    }

    export const samples: ProgramSample[] = [
        {
            name: "Basic (Almost Empty)",
            vertexShader: trimMargin(`
                precision highp float;
                
                attribute vec2 vertex;

                uniform float w;
                
                void main() {
                    gl_Position = vec4(vertex, 0.0, w + 2.0);
                }
            `),
            fragmentShader: trimMargin(`
                precision mediump float;

                uniform vec3 color;

                const vec3 one = vec3(1.0, 1.0, 1.0);

                void main() {
                    gl_FragColor = vec4((color + one) / 2.0, 1.0);
                }
            `)
        },
        {
            name: "3D Sinc (Vertex Shader Lighting)",
            vertexShader: trimMargin(`
                precision highp float;
        
                attribute vec2 vertex;
                uniform float magnitude;
                uniform float phase;
                                
                uniform vec2 eyeDirection;
                uniform float eyeDistance;
                uniform float focalRatio;
                                
                uniform vec2 lightDirection;
                uniform float lightDistance;
                uniform float shininess;

                varying float shade;
                                
                const float PI = 3.1415926535897932384626433832795;
                const float epsilon = 0.01;
                const vec2 dx = vec2(epsilon, 0.0); 
                const vec2 dy = vec2(0.0, epsilon); 
                
                float adapt(in float x, in float min, in float max) {
                    return min + (x + 1.0) * (max - min) / 2.0;
                }
                
                float sinc(in float x) {
                    return -epsilon < x && x < epsilon ? 1.0 : sin(x) / x;
                }
                                
                vec3 surface(in vec2 v) {
                    return vec3(v.y, magnitude * sinc(4.0 * PI * (length(v) + phase)), v.x);
                }
                
                vec3 normalAt(in vec2 v) {
                    vec3 dsx = surface(v + dx) - surface(v - dx);
                    vec3 dsy = surface(v + dy) - surface(v - dy);
                    return normalize(cross(dsx, dsy));
                }

                vec3 rotate(in vec3 v, in vec2 direction) {
                    float azimuth  = +PI * direction.x;
                    float altitude = -PI * direction.y / 2.0;
                    float sy = sin(azimuth);
                    float cy = cos(azimuth);
                    float sx = sin(altitude);
                    float cx = cos(altitude);
                    return vec3(
                        +cy * v.x + sy * sx * v.y + sy * cx * v.z,
                                         cx * v.y -      sx * v.z,
                        -sy * v.x + cy * sx * v.y + cy * cx * v.z
                    );
                }

                vec3 model(in vec3 v) {
                    return rotate(v, eyeDirection);
                }
                                
                vec3 view(in vec3 v) {
                    float distance = adapt(eyeDistance, 1.0, 9.0);
                    return vec3(v.x, v.y, v.z - distance);
                }
                                
                vec4 project(in vec3 v) {
                    float f = adapt(focalRatio, 1.0, 9.0);
                    float z = 1.25 * v.z / f + 2.25;
                    return vec4(v.xy, -z / f, -v.z / f);
                }
                                
                vec3 lightRayAt(in vec3 v) {
                    float distance = adapt(lightDistance, 1.0, 9.0);
                    vec3 lightPosition = rotate(vec3(0.0, 0.0, distance), lightDirection);
                    return normalize(v - lightPosition);
                }

                void main() {
                    vec3 position = model(surface(vertex));
                    vec3 normal = model(normalAt(vertex));
                    vec3 lightRay = lightRayAt(position);
                    position = view(position);

                    float s = adapt(shininess, 0.0, 1.0);

                    vec3 p = normalize(position);
                    vec3 n = normalize(normal);
                    vec3 l = normalize(lightRay);
                
                    float facing = -dot(p, n);
                    facing = facing >= 0.0 ? 1.0 : -1.0;
                    n *= facing;
                
                    float cosLN = -dot(l, n);
                    vec3 r = n * 2.0 * cosLN + l;
                    float cosRP = -dot(r, p);
                    float diffuse = (cosLN + 1.0) / 2.0;
                    diffuse *= diffuse;
                    float shine = clamp(cosRP, 0.0, 1.0);
                    shine = pow(shine, 8.0);
                
                    shade = (diffuse + shine * s) * facing;

                    gl_Position = project(position);
                }
            `),
            fragmentShader: trimMargin(`
                precision mediump float;

                varying float shade;
                
                uniform vec3 color;

                void main() {
                    gl_FragColor = vec4(abs(shade) * (sign(shade) * color + vec3(1.0)) / 2.0, 1.0);
                }
            `)
        },
        {
            name: "3D Sinc (Fragment Shader Lighting)",
            vertexShader: trimMargin(`
                precision highp float;
                
                attribute vec2 vertex;
                uniform float magnitude;
                uniform float phase;
                                
                uniform vec2 eyeDirection;
                uniform float eyeDistance;
                uniform float focalRatio;
                                
                uniform vec2 lightDirection;
                uniform float lightDistance;
                
                varying vec3 position;
                varying vec3 normal;
                varying vec3 lightRay;
                                
                const float PI = 3.1415926535897932384626433832795;
                const float epsilon = 0.01;
                const vec2 dx = vec2(epsilon, 0.0); 
                const vec2 dy = vec2(0.0, epsilon); 
                                
                float adapt(in float x, in float min, in float max) {
                    return min + (x + 1.0) * (max - min) / 2.0;
                }
                                
                float sinc(in float x) {
                    return -epsilon < x && x < epsilon ? 1.0 : sin(x) / x;
                }
                                
                vec3 surface(in vec2 v) {
                    return vec3(v.y, magnitude * sinc(4.0 * PI * (length(v) + phase)), v.x);
                }
                                
                vec3 normalAt(in vec2 v) {
                    vec3 dsx = surface(v + dx) - surface(v - dx);
                    vec3 dsy = surface(v + dy) - surface(v - dy);
                    return cross(dsx, dsy);
                }
                
                vec3 rotate(in vec3 v, in vec2 direction) {
                    float azimuth  = +PI * direction.x;
                    float altitude = -PI * direction.y / 2.0;
                    float sy = sin(azimuth);
                    float cy = cos(azimuth);
                    float sx = sin(altitude);
                    float cx = cos(altitude);
                    return vec3(
                        +cy * v.x + sy * sx * v.y + sy * cx * v.z,
                                        cx * v.y -      sx * v.z,
                        -sy * v.x + cy * sx * v.y + cy * cx * v.z
                    );
                }
                
                vec3 model(in vec3 v) {
                    return rotate(v, eyeDirection);
                }
                                
                vec3 view(in vec3 v) {
                    float distance = adapt(eyeDistance, 1.0, 9.0);
                    return vec3(v.x, v.y, v.z - distance);
                }
                                
                vec4 project(in vec3 v) {
                    float f = adapt(focalRatio, 1.0, 9.0);
                    float z = 1.25 * v.z / f + 2.25;
                    return vec4(v.xy, -z / f, -v.z / f);
                }
                                
                vec3 lightRayAt(in vec3 v) {
                    float distance = adapt(lightDistance, 1.0, 9.0);
                    vec3 lightPosition = rotate(vec3(0.0, 0.0, distance), lightDirection);
                    return v - lightPosition;
                }
                
                void main() {
                    position = model(surface(vertex));
                    normal = model(normalAt(vertex));
                    lightRay = lightRayAt(position);
                    position = view(position);
                    gl_Position = project(position);
                }
            `),
            fragmentShader: trimMargin(`
                precision mediump float;

                varying vec3 position;
                varying vec3 normal;
                varying vec3 lightRay;
                                
                uniform vec3 color;
                uniform float shininess;
                
                float adapt(in float x, in float min, in float max) {
                    return min + (x + 1.0) * (max - min) / 2.0;
                }
                                
                void main() {
                    float s = adapt(shininess, 0.0, 1.0);

                    vec3 p = normalize(position);
                    vec3 n = normalize(normal);
                    vec3 l = normalize(lightRay);
                
                    float facing = -dot(p, n);
                    facing = facing >= 0.0 ? 1.0 : -1.0;
                    n *= facing;
                
                    float cosLN = -dot(l, n);
                    vec3 r = n * 2.0 * cosLN + l;
                    float cosRP = -dot(r, p);
                    float diffuse = (cosLN + 1.0) / 2.0;
                    diffuse *= diffuse;
                    float shine = clamp(cosRP, 0.0, 1.0);
                    shine = pow(shine, 8.0);
                
                    float shade = diffuse + shine * s;
                    gl_FragColor = vec4(shade * (facing * color + vec3(1.0)) / 2.0, 1.0);
                }
            `)
        }
    ];

    function trimMargin(code: string): string {
        const lines = code.split("\n");
        const margin = lines
            .map(line => line.search(/[^\s]/))
            .filter(index => index >= 0)
            .reduce((a, b) => a < b ? a : b)
        return lines
            .map(line => line.length > margin ? line.substring(margin) : line)
            .reduce((a, b) => a + "\n" + b)
            .trim();
    }

}