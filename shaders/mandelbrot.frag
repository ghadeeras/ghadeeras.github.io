uniform vec2 center;
uniform float scale;
uniform vec2 color;
uniform float intensity;
uniform float palette;

const int depth = 1024; 

const float PI = atan(0.0, -1.0);

const float colorAngle = 2.0 * PI / 3.0;
const mat3x3 colorMatrix = 0.5 * mat3x3(
    vec3(             1.0,              0.0, 1.0),
    vec3(cos( colorAngle), sin( colorAngle), 1.0),
    vec3(cos(-colorAngle), sin(-colorAngle), 1.0)
);

const vec3 black = vec3(0.0);
const vec3 white = vec3(1.0);
const vec3 grey  = vec3(0.5);

const float margin = 0.03125;
const float juliaWindowSize = 1.0 - 2.0 * margin; 
const float juliaWindowHalfSize = 0.5 * juliaWindowSize;
const float juliaScale = 2.0 / juliaWindowHalfSize;

vec3 rgbColor(vec2 hsColor) {
    float hue = PI * hsColor.x;
    float saturation = hsColor.y;
    vec3 c = vec3(cos(hue), sin(hue), 1.0);
    return mix(white, c * colorMatrix, saturation);
}

vec2 mul(vec2 c1, vec2 c2) {
    vec2 r = c1 * c2;
    vec2 i = c1 * c2.yx;
    return vec2(r.x - r.y, i.x + i.y);
}

float mandelbrot(vec2 c, vec2 z) {
    for (int i = 0; i < depth; i++) {
        z = mul(z, z) + c;
        float l2 = dot(z, z);
        if (l2 > 4.0) {
            float a = (32.0 * intensity + 1.0) * float(i) * PI / float(depth);
            return mix((cos(a) + 1.0) / 2.0, exp(-a), palette);
        }
    }
    return 0.0;
}

float mandelbrotOrJulia(vec2 p, bool julia) {
    vec2 c = julia ? center : scale * p + center;
    vec2 z = julia ? p : vec2(0.0);
    return mandelbrot(c, z);
}

vec3 adaptToJuliaWindow(vec2 position, float aspect, float pixelSize) {
    vec2 min = (aspect >= 1.0 ? vec2(-aspect, -1.0) : vec2(-1.0, -1.0 / aspect)) + margin;
    vec2 max = min + juliaWindowSize;
    vec2 juliaCenter = min + juliaWindowHalfSize;
    vec2 innerMin = min + pixelSize;
    vec2 innerMax = max - pixelSize;
    if (position.x > innerMin.x && position.y > innerMin.y && position.x < innerMax.x && position.y < innerMax.y) {
        return vec3(juliaScale * (position - juliaCenter), 1.0);
    } if (position.x < min.x || position.y < min.y || position.x > max.x || position.y > max.y) {
        return vec3(position, -1.0);
    } else {
        vec2 farPoint = (vec2(2.0) - center) / scale;
        return vec3(farPoint, 0.0);
    }
}

bool underCrossHairs(vec2 position, float pixelSize) {
    float pixelSize2 = pixelSize * pixelSize;
    float xy = abs(position.x * position.y);
    return pixelSize2 < xy && xy < 4.0 * pixelSize2;
}

vec4 colorAt(vec2 position, float aspect, float pixelSize) {
    vec3 c = rgbColor(color);
    vec3 pos = adaptToJuliaWindow(position, aspect, pixelSize);
    bool inJuliaWindow = pos.z > 0.0;
    vec3 result = mandelbrotOrJulia(pos.xy, inJuliaWindow) * c * abs(pos.z);
    return vec4(
        underCrossHairs(position, pixelSize)
            ? result.x > grey.x || result.y > grey.y || result.z > grey.z ? black : white
            : result, 
        1.0
    );
}