const EPSILON: f32 = 0x1P-11;

struct Uniforms {
    modelMatrix: mat3x3<f32>,
    orientation: mat3x3<f32>,
    position: vec3<f32>,
    lightDirection: vec3<f32>,
    lightNarrowness: f32,
    contourValue: f32,
    focalLength: f32,
    step: f32,
};

struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
    extent: vec3<f32>,
    length: f32,
};

struct Sample {
    gradient: vec3<f32>,
    value: f32,
    derivative: f32,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1)
var field: texture_3d<f32>;

@group(0) @binding(2)
var fieldSampler: sampler;

var<private> ray: Ray;
var<private> sample: Sample;
var<private> firstFieldSign: f32;

fn colorAt(position: vec2<f32>, aspectRatio: f32, pixelSize: f32) -> vec4<f32> {
    let halfPixel = 0.5 * pixelSize;
    return sqrt(0.25 * (
        sampleColorAt(position) +
        sampleColorAt(position + vec2(halfPixel,       0.0)) +
        sampleColorAt(position + vec2(      0.0, halfPixel)) +
        sampleColorAt(position + vec2(halfPixel, halfPixel))
    ));
}

fn sampleColorAt(position: vec2<f32>) -> vec4<f32> {
    ray = primaryRay(position);
    if (hitBounds() && hitContourSurface()) {
        backOut();
        return hitColor();
    } else {
        return escapingRayColor();
    }
}

fn primaryRay(position: vec2<f32>) -> Ray {
    let localRayDirection = vec3(position, -uniforms.focalLength);
    let globalRayDirection = uniforms.orientation * localRayDirection;
    return newRay(
        uniforms.position * uniforms.modelMatrix, 
        globalRayDirection * uniforms.modelMatrix
    );
}

fn hitBounds() -> bool {
    let d = 1.0 / ray.direction;
    let m = 1.0 - EPSILON;
    let vm1 = max(d * (-m - ray.origin), vec3(0.0));
    let vp1 = max(d * ( m - ray.origin), vec3(0.0));
    let xRange = sort(vm1.x, vp1.x);
    let yRange = sort(vm1.y, vp1.y);
    let zRange = sort(vm1.z, vp1.z);
    let range = vec2(
        max(xRange[0], max(yRange[0], zRange[0])),
        min(xRange[1], min(yRange[1], zRange[1]))
    );
    let hit = range[0] < range[1]; 
    if (hit) {
        ray.length = range[0];
        ray.extent = ray.origin + ray.length * ray.direction;
    }
    sample = currentSample();
    firstFieldSign = sign(sample.value);
    return hit;
}

fn hitContourSurface() -> bool {
    let initialFieldSign = sign(sample.value);
    var fieldSign = initialFieldSign;
    var i = 0;
    while ((i < 256) && (fieldSign == initialFieldSign) && inBounds()) {
        extendRay();
        fieldSign = sign(sample.value);
        i++;
    }
    return (i < 256) && inBounds();
}

fn backOut() {
    if (sample.value != 0.0) {
        flipRay();
        hitContourSurface();
        flipRay();
    }
}

fn hitColor() -> vec4<f32> {
    if (abs(sample.derivative) < EPSILON) {
        extendRay();
    }
    ray = newRay(
        uniforms.modelMatrix * ray.origin,
        uniforms.modelMatrix * ray.direction
    );
    let normal = normalize(firstFieldSign * uniforms.modelMatrix * sample.gradient);
    let reflection = reflect(ray.direction, normal);
    let specular = max(pow(dot(reflection, uniforms.lightDirection), uniforms.lightNarrowness), 0.0);
    let diffuse = 0.5 * (dot(normal, uniforms.lightDirection) + 1.0);
    let shade = 0.25 * diffuse * diffuse + 0.75 * specular;
    let hue = 0.5 * (uniforms.contourValue + 1.0);
    return vec4(4.0 * shade * vec3(hue, 0.0, 1.0 - hue), 1.0);
}

fn escapingRayColor() -> vec4<f32> {
    ray = newRay(
        uniforms.modelMatrix * ray.origin,
        uniforms.modelMatrix * ray.direction
    );
    let shade = max(pow(dot(ray.direction, uniforms.lightDirection), uniforms.lightNarrowness), 0.0);
    return select(
        vec4(vec3(shade), 1.0),
        vec4(1.0, 0.0, 0.0, 1.0),
        inBounds()
    );
}

fn extendRay() {
    let extension = min(uniforms.step, select(uniforms.step, -sample.value / sample.derivative, abs(sample.derivative) > EPSILON));
    ray.length += select(uniforms.step, extension, extension > 0.0) + EPSILON;
    ray.extent = ray.origin + ray.length * ray.direction;
    sample = currentSample();
}

fn currentSample() -> Sample {
    let coords = 0.5 * (ray.extent + 1.0);
    let texel = textureSampleLevel(field, fieldSampler, coords, 0.0);
    let gradient = texel.xyz;
    let value = texel.w - uniforms.contourValue;
    let derivative = dot(ray.direction, gradient);
    return Sample(gradient, value, derivative);
}

fn flipRay() {
    ray.direction = -ray.direction;
    ray.length = -ray.length;
    sample.derivative = -sample.derivative;
}

fn inBounds() -> bool {
    return all(abs(ray.extent) <= vec3(1.0));
}

fn newRay(origin: vec3<f32>, direction: vec3<f32>) -> Ray {
    return Ray(origin, normalize(direction), origin, 0.0);
}

fn sort(a: f32, b: f32) -> vec2<f32> {
    return select(vec2(b, a), vec2(a, b), a <= b);
}
