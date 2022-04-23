// ----- Common Stuff ----- // 

struct Uniforms {
    matrix: mat3x3<f32>;
    position: vec3<f32>;
    randomSeed: vec4<u32>;
    focalLength: f32;
    aspectRatio: f32;
    samplesPerPixel: u32;
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

// ----- Vertex Shader ----- //

struct Vertex {
    @builtin(position) position: vec4<f32>;
    @location(0) xy: vec2<f32>;
};

var<private> vertices: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2(-1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
);

@stage(vertex)
fn v_main(@builtin(vertex_index) i: u32) -> Vertex {
    var xy = vertices[i & 3u];
    return Vertex(
        vec4(xy, 0.0, 1.0),
        vec2(xy.x * uniforms.aspectRatio, xy.y)
    );
}

// ----- Fragment Shader ----- //

struct Ray {
    origin: vec3<f32>;
    direction: vec3<f32>;
    invDirection: vec3<f32>;
};

struct Traverser {
    ray: Ray;
    step: vec3<i32>;
    limit: vec3<i32>;
    distance: vec3<f32>;
    cell: vec3<i32>;
}

struct Volume {
    min: vec3<f32>;
    max: vec3<f32>;
};

struct Box {
    volume: Volume;
    material: u32;
};

struct Hit {
    box: u32;
    distance: f32;
}

struct HitDetails {
    ray: Ray;
    position: vec3<f32>;
    normal: vec3<f32>;
    material: vec4<f32>;
}

type Cell = array<u32, 8>;
type Grid = array<Cell, 262144>; // 262144 = 64 * 64 * 64

@group(0) @binding(1)
var<storage, read> materials: array<vec4<f32>>;

@group(0) @binding(2)
var<storage, read> boxes: array<Box>;

@group(0) @binding(3)
var<storage, read> grid: Grid;

var<private> rng: vec4<u32>;
var<private> pixelSize: f32;
var<private> lightPosition: vec3<f32>;

let EPSILON: f32 = 0x1P-11;
let RND_PRECISION: f32 = 0x1P-22;
let MAX_BOXES_PER_CELL: u32 = 8u;
let GRID_SIZE: vec3<i32> = vec3<i32>(262144, 4096, 64);
let NO_BOX: u32 = 0xFFFFFFFFu;

// The xorshift128 PRNG algorithm. See: https://en.wikipedia.org/wiki/Xorshift
fn next_u32() -> u32 {
    var t = rng.w;
    var s = rng.x;

    t = t ^ (t << 11u);
	t = t ^ (t >> 8u);
    s = s ^ (s >> 19u);

    var result = t ^ s;
    rng = vec4(result, rng.xyz);
    return result;
}

fn next_unorm() -> f32 {
    var n = (next_u32() + 0x1FFu) >> 10u;
    return f32(n) * RND_PRECISION;
}

fn next_vec2() -> vec2<f32> {
    return vec2(next_unorm(), next_unorm());
}

fn seedRNG(position: vec2<f32>) {
    var p = vec2<u32>(position);
    rng = vec4(p, p) + vec4(3u, 5u, 7u, 11u);
    next_u32();
    next_u32();
    next_u32();
    next_u32();
    rng = uniforms.randomSeed * rng;
}

fn init(vertex: Vertex) {
    seedRNG(vertex.position.xy);
    pixelSize = dpdy(vertex.xy.y);
    lightPosition = vec3(1.0, 2.0, 0.0) * uniforms.matrix;
}

fn pixelSample(pixel: vec2<f32>) -> vec2<f32> {
    return pixel + next_vec2() * pixelSize;
}

fn primaryRay(pixel: vec2<f32>) -> Ray {
    var direction = normalize(vec3(pixel, -uniforms.focalLength) * uniforms.matrix);
    return Ray(
        uniforms.position,
        direction,
        1.0 / direction,
    );
}

fn hitRange(volume: Volume, ray: Ray, range: vec2<f32>) -> vec2<f32> {
    var t1 = (volume.min - ray.origin) * ray.invDirection;
    var t2 = (volume.max - ray.origin) * ray.invDirection;
    var mn = min(t1, t2);
    var mx = max(t1, t2);
    var d1 = max(max(max(mn.x, mn.y), mn.z), range[0]);
    var d2 = min(min(min(mx.x, mx.y), mx.z), range[1]);
    return vec2(d1, d2);
}

fn shoot(cell: Cell, ray: Ray, range: vec2<f32>) -> Hit {
    var r = range;
    var nearestBox = NO_BOX;
    for (var i = 0u; i < MAX_BOXES_PER_CELL; i = i + 1u) {
        var box = cell[i];
        if (box == NO_BOX) {
            break;
        }
        var newR = hitRange(boxes[box].volume, ray, r);
        if (newR[0] < newR[1]) {
            r[1] = newR[0];
            nearestBox = box;
        }
    }
    return Hit(nearestBox, r[1]);
}

fn normalAt(position: vec3<f32>, volume: Volume) -> vec3<f32> {
    var v = (position - volume.min) / (volume.max - volume.min) - 0.5;
    var absV = abs(v);
    var m = max(absV.x, max(absV.y, absV.z));
    var n = trunc(v / m);
    return normalize(n);
}

fn detailsOf(hit: Hit, ray: Ray) -> HitDetails {
    var box = boxes[hit.box];
    var position = ray.origin + ray.direction * hit.distance;
    var normal = normalAt(position, box.volume);
    return HitDetails(ray, position, normal, materials[box.material]);
}

fn traverser(ray: Ray) -> Traverser {
    var direction = sign(ray.direction);
    var step = vec3<i32>(direction) << vec3(12u, 6u, 0u); 
    let rearCorner = max(-direction, vec3(0.0));
    let limit = select(vec3(-1), GRID_SIZE, step > vec3(0));
    let distance = (rearCorner - fract(ray.origin)) * ray.invDirection; 
    let cell = vec3<i32>(ray.origin) << vec3(12u, 6u, 0u);
    return Traverser(ray, step, limit, distance, cell);
}

fn next(t: ptr<function, Traverser>) -> f32 {
    let next = (*t).distance + abs((*t).ray.invDirection);
    var result = min(next.x, min(next.y, next.z));
    var closest = (next == vec3(result));
    (*t).distance = select((*t).distance, next, closest);
    (*t).cell = (*t).cell + select(vec3(0), (*t).step, closest);
    return result;
}

fn traceGrid(ray: Ray) -> vec3<f32> {
    var t = traverser(ray);
    var range = vec2(EPSILON, EPSILON);
    loop {
        if (any(t.cell == t.limit)) {
            return vec3(0.0); 
        }
        var cell = grid[t.cell.x + t.cell.y + t.cell.z];
        range[1] = next(&t);
        var hit = shoot(cell, ray, range);
        if (hit.box != NO_BOX) {
            var hitDetails = detailsOf(hit, ray);
            var shade = (1.0 - dot(hitDetails.normal, normalize(hitDetails.position - lightPosition - ray.origin))) * 0.5;
            return hitDetails.material.xyz * shade * shade * 64.0 / (64.0 + hit.distance * hit.distance);
        }
    }
}

fn estimateColor(pixel: vec2<f32>) -> vec3<f32> {
    var c = vec3(0.0);
    for (var j = 0u; j < uniforms.samplesPerPixel; j = j + 1u) {
        c = c + traceGrid(primaryRay(pixelSample(pixel)));
    };
    return c / f32(uniforms.samplesPerPixel);
}

@stage(fragment)
fn f_main(vertex: Vertex) -> @location(0) vec4<f32> {
    init(vertex);
    return vec4(estimateColor(vertex.xy), 1.0);
}