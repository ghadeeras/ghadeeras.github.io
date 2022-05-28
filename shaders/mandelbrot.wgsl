struct Varyings {
    @builtin(position) pos: vec4<f32>,
    @location(0) c: vec2<f32>,
};

@stage(vertex)
fn v_main(@location(0) pos: vec2<f32>) -> Varyings {
    return Varyings(vec4<f32>(pos, 0.0, 1.0), pos);
}

struct Params {
  center: vec2<f32>,
  color: vec2<f32>,
  juliaNumber: vec2<f32>,
  scale: f32,
  intensity: f32,
  palette: f32,
  julia: f32,
};

@group(0)
@binding(0)
var<uniform> params: Params;

let PI = 3.1415926535897932384626433832795;

let colorAngle = 2.0943951023931954923084289221863;

let redVec = vec2<f32>(1.0, 0.0);
let greenVec = vec2<f32>(-0.5, 0.86602540378443864676372317075294);
let blueVec = vec2<f32>(-0.5, -0.86602540378443864676372317075294);

let white = vec3<f32>(1.0, 1.0, 1.0);

fn component(v: vec2<f32>, c: vec2<f32>) -> f32 {
    return (dot(v, c) + 1.0) / 2.0;
}

fn rgbColor() -> vec3<f32> {
    var hue = PI * params.color.x;
    var saturation = params.color.y;
    var c = vec2<f32>(cos(hue), sin(hue));
    return mix(
        white, 
        vec3<f32>(
            component(c, redVec), 
            component(c, greenVec), 
            component(c, blueVec)
        ), 
        saturation
    );
}

fn mul(c1: vec2<f32>,c2: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(
        c1.x * c2.x - c1.y * c2.y,
        c1.x * c2.y + c1.y * c2.x
    );
}

fn mandelbrot(c: vec2<f32>, zz: vec2<f32>) -> f32 {
    var z = zz;
    for (var i = 0; i < 1024; i = i + 1) {
        z = mul(z, z) + c;
        var l = length(z);
        if (l > 2.0) {
            var a = (32.0 * params.intensity + 1.0) * PI * f32(i) / 1024.0;
            return mix((cos(a) + 1.0) / 2.0, exp(-a), params.palette);
        }
    }
    return 0.0;
}

fn mandelbrotOrJulia(p: vec2<f32>) -> f32 {
    if (params.julia != 0.0) {
        return mandelbrot(params.juliaNumber.xy, 2.0 * p);
    }
    return mandelbrot(params.scale * p + params.center, vec2<f32>(0.0));
}

@stage(fragment)
fn f_main(varyings: Varyings) -> @location(0) vec4<f32> {
    var color = rgbColor();
    return vec4<f32>(mandelbrotOrJulia(varyings.c) * color, 1.0);
}