struct Params {
  center: vec2<f32>,
  color: vec2<f32>,
  scale: f32,
  intensity: f32,
  xray: u32,
  crosshairs: u32,
};

@group(0)
@binding(0)
var<uniform> params: Params;

const depth = 1024;

const PI = 3.1415926535897932384626433832795;

const colorAngle = 2.0 * PI / 3.0;
const sinColorAngle = 0.86602540378443864676372317075294;
const colorMatrix = 0.5 * mat3x3<f32>(
    vec3<f32>( 1.0,            0.0, 1.0),
    vec3<f32>(-0.5,  sinColorAngle, 1.0),
    vec3<f32>(-0.5, -sinColorAngle, 1.0),
);

const black = vec3<f32>(0.0);
const white = vec3<f32>(1.0);
const grey  = vec3<f32>(0.5);

const margin = 0.03125;
const juliaWindowSize = 1.0 - 2.0 * margin; 
const juliaWindowHalfSize = 0.5 * juliaWindowSize;
const juliaScale = 2.0 / juliaWindowHalfSize;

fn rgbColor(hsColor: vec2<f32>) -> vec3<f32> {
    var hue = PI * hsColor.x;
    var saturation = hsColor.y;
    var c = vec3<f32>(cos(hue), sin(hue), 1.0);
    return mix(white, c * colorMatrix, saturation);
}

fn mul(c1: vec2<f32>, c2: vec2<f32>) -> vec2<f32> {
    let r = c1 * c2;
    let i = c1 * c2.yx;
    return vec2(r.x - r.y, i.x + i.y);
}

fn mandelbrot(c: vec2<f32>, z0: vec2<f32>) -> f32 {
    var z = z0;
    for (var i = 0; i < depth; i += 1) {
        z = mul(z, z) + c;
        var l2 = dot(z, z);
        if (l2 > 4.0) {
            let e = exp(-f32(i) * (1.0 + params.intensity * 255.0) / f32(depth));
            return select(e, 1.0 - e, params.xray != 0);
        }
    }
    return 0.0;
}

fn mandelbrotOrJulia(p: vec2<f32>, julia: bool) -> f32 {
    let c = select(params.scale * p + params.center, params.center, julia);
    let z = select(vec2<f32>(0.0), p, julia);
    return mandelbrot(c, z);
}

fn adaptToJuliaWindow(position: vec2<f32>, aspect: f32, pixelSize: f32) -> vec3<f32> {
    let min = select(vec2(-1.0, -1.0 / aspect), vec2(-aspect, -1.0), aspect >= 1.0) + margin;
    let max = min + juliaWindowSize;
    let center = min + juliaWindowHalfSize;
    let innerMin = min + pixelSize;
    let innerMax = max - pixelSize;
    if (all(position > innerMin) && all(position < innerMax)) {
        return vec3(juliaScale * (position - center), 1.0);
    } if (any(position < min) || any(position > max)) {
        return vec3(position, -1.0);
    } else {
        let farPoint = (vec2(2.0) - params.center) / params.scale;
        return vec3(farPoint, 0.0);
    }
}

fn underCrossHairs(position: vec2<f32>, pixelSize: f32) -> bool {
    let pixelSize2 = pixelSize * pixelSize;
    let posXY = abs(position.x * position.y);
    return params.crosshairs != 0 && pixelSize2 < posXY && posXY < (4.0 * pixelSize2);
}

fn colorAt(position: vec2<f32>, aspect: f32, pixelSize: f32) -> vec4<f32> {
    let color = rgbColor(params.color);
    let pos = adaptToJuliaWindow(position, aspect, pixelSize);
    let inJuliaWindow = pos.z > 0.0;
    let result = mandelbrotOrJulia(pos.xy, inJuliaWindow) * color * abs(pos.z);
    return vec4(select(
        select(result, select(black, color, params.xray != 0), pos.z == 0.0), 
        vec3(select(color, black, any(result > grey))), 
        underCrossHairs(position, pixelSize)
    ), 1.0);    
}