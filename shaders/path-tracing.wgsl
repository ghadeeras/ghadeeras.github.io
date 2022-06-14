// ----- Common Stuff ----- // 

struct Uniforms {
    matrix: mat3x3<f32>,
    position: vec3<f32>,
    randomSeed: vec4<u32>,
    focalLength: f32,
    aspectRatio: f32,
    samplesPerPixel: u32,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

// ----- Vertex Shader ----- //

struct Vertex {
    @builtin(position) position: vec4<f32>,
    @location(0) xy: vec2<f32>,
};

var<private> vertices: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2(-1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
);

@stage(vertex)
fn v_main(@builtin(vertex_index) i: u32) -> Vertex {
    let xy = vertices[i & 3u];
    return Vertex(
        vec4(xy, 0.0, 1.0),
        vec2(xy.x * uniforms.aspectRatio, xy.y)
    );
}

// ----- Fragment Shader ----- //

struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
    invDirection: vec3<f32>,
};

struct Traverser {
    ray: Ray,
    step: vec3<i32>,
    limit: vec3<i32>,
    distance: vec3<f32>,
    cell: vec3<i32>,
}

struct Volume {
    min: vec3<f32>,
    max: vec3<f32>,
    invSize: vec3<f32>,
};

struct Box {
    volume: Volume,
    faceMaterials: array<u32, 6>,
};

struct Hit {
    box: u32,
    distance: f32,
}

struct HitDetails {
    ray: Ray,
    position: vec3<f32>,
    normal: vec3<f32>,
    material: vec4<f32>,
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

let EPSILON: f32 = 0x1P-11;
let RND_PRECISION: f32 = 0x1P-22;
let MAX_BOXES_PER_CELL: u32 = 8u;
let GRID_SIZE: vec3<i32> = vec3<i32>(262144, 4096, 64);
let NULL: u32 = 0xFFFFFFFFu;
let TWO_PI = 6.283185307179586476925286766559;

var<private> normals: array<vec3<f32>, 6> = array<vec3<f32>, 6>(
    vec3( 0.0,  0.0, -1.0),
    vec3( 0.0, -1.0,  0.0),
    vec3(-1.0,  0.0,  0.0),
    vec3( 1.0,  0.0,  0.0),
    vec3( 0.0,  1.0,  0.0),
    vec3( 0.0,  0.0,  1.0),
); 

// The xorshift128 PRNG algorithm. See: https://en.wikipedia.org/wiki/Xorshift
fn next_u32() -> u32 {
    var t = rng.w;
    var s = rng.x;

    t = t ^ (t << 11u);
	t = t ^ (t >> 8u);
    s = s ^ (s >> 19u);

    rng = vec4(t ^ s, rng.xyz);
    return rng.x;
}

fn next_unorm() -> f32 {
    let n = (next_u32() + 0x1FFu) >> 10u;
    return f32(n) * RND_PRECISION;
}

fn next_vec2() -> vec2<f32> {
    return vec2(next_unorm(), next_unorm());
}

fn seedRNG(position: vec2<f32>) {
    let p = vec2<u32>(position);
    rng = (p.xyyx + vec4(3u, 7u, 5u, 11u)) * uniforms.randomSeed;
    next_u32();
    next_u32();
    next_u32();
    next_u32();
}

fn init(vertex: Vertex) {
    seedRNG(vertex.position.xy);
    pixelSize = dpdy(vertex.xy.y) * 1.5;
}

fn pixelSample(pixel: vec2<f32>) -> vec2<f32> {
    return pixel + next_vec2() * pixelSize;
}

fn newRay(position: vec3<f32>, direction: vec3<f32>) -> Ray {
    return Ray(
        position,
        direction,
        1.0 / direction,
    );
}

fn primaryRay(pixel: vec2<f32>) -> Ray {
    let direction = vec3(pixel, -uniforms.focalLength) * uniforms.matrix;
    return newRay(uniforms.position, direction);
}

fn hitRange(volume: Volume, ray: Ray, range: vec2<f32>) -> vec2<f32> {
    let t1 = (volume.min - ray.origin) * ray.invDirection;
    let t2 = (volume.max - ray.origin) * ray.invDirection;
    let mn = min(t1, t2);
    let mx = max(t1, t2);
    let d1 = max(max(max(mn.x, mn.y), mn.z), range[0]);
    let d2 = min(min(min(mx.x, mx.y), mx.z), range[1]);
    return vec2(d1, d2);
}

fn shoot(cell: Cell, ray: Ray, range: vec2<f32>) -> Hit {
    var r = range;
    var nearestBox = NULL;
    for (var i = 0u; i < MAX_BOXES_PER_CELL; i = i + 1u) {
        let box = cell[i];
        if (box == NULL) {
            break;
        }
        let newR = hitRange(boxes[box].volume, ray, r);
        if (newR[0] < newR[1]) {
            r[1] = newR[0];
            nearestBox = box;
        }
    }
    return Hit(nearestBox, r[1]);
}

fn face(position: vec3<f32>, volume: Volume) -> i32 {
    let v = (position - volume.min) * volume.invSize - 1.0;
    let absV = abs(v);
    let xFace = select(2, 3, v.x > 0.0); 
    let yFace = select(1, 4, v.y > 0.0);
    let zFace = select(0, 5, v.z > 0.0); 
    return select(
        select(zFace, yFace, absV.y > absV.z),
        select(zFace, xFace, absV.x > absV.z),
        absV.x > absV.y
    );
}

fn detailsOf(hit: Hit, ray: Ray) -> HitDetails {
    let box = boxes[hit.box];
    let position = ray.origin + ray.direction * hit.distance;
    let face = face(position, box.volume);
    return HitDetails(ray, position, normals[face], materials[box.faceMaterials[face]]);
}

fn traverser(ray: Ray) -> Traverser {
    let direction = sign(ray.direction);
    let step = vec3<i32>(direction) << vec3(12u, 6u, 0u); 
    let rearCorner = max(-direction, vec3(0.0));
    let limit = select(vec3(-1), GRID_SIZE, step > vec3(0));
    let distance = (rearCorner - fract(ray.origin)) * ray.invDirection; 
    let cell = vec3<i32>(ray.origin) << vec3(12u, 6u, 0u);
    return Traverser(ray, step, limit, distance, cell);
}

fn next(t: ptr<function, Traverser>) -> f32 {
    let next = (*t).distance + abs((*t).ray.invDirection);
    let result = min(next.x, min(next.y, next.z));
    let closest = (next == vec3(result));
    (*t).distance = select((*t).distance, next, closest);
    (*t).cell = (*t).cell + select(vec3(0), (*t).step, closest);
    return result;
}

fn shootInGrid(ray: Ray) -> Hit {
    var t = traverser(ray);
    var range = vec2(EPSILON);
    var hit = Hit(NULL, range[1]);
    loop {
        let cell = grid[t.cell.x + t.cell.y + t.cell.z];
        range[1] = next(&t);
        hit = shoot(cell, ray, range);
        if (hit.box != NULL || any(t.cell == t.limit)) {
            return hit;
        }
    }
}

fn diffuseDirection(normal: vec3<f32>) -> vec3<f32> {
    let matrix = mat3x3(abs(normal.yzx), normal, normal.zxy);

    let squarePoint = next_vec2();
    let cosTheta = sqrt(squarePoint.y);
    let sinTheta = sqrt(1.0 - squarePoint.y);
    let phi = TWO_PI * squarePoint.x;

    return matrix * vec3(sinTheta * sin(phi), cosTheta, sinTheta * cos(phi));
}

fn scatterRay(hitDetails: HitDetails) -> Ray {
    var direction: vec3<f32>;
    if (next_unorm() < hitDetails.material.w) {
        direction = diffuseDirection(hitDetails.normal);
    } else {
        direction = reflect(hitDetails.ray.direction, hitDetails.normal);
    }
    return newRay(hitDetails.position, direction);
}

fn trace(ray: Ray) -> vec3<f32> {
    var r = ray;
    var color = vec3(1.0);
    for (var i = 0; i < 4; i = i + 1) {
        let hit = shootInGrid(r);
        if (hit.box == NULL) {
            break;
        }
        let hitDetails = detailsOf(hit, r);
        color = color * hitDetails.material.xyz;
        if (hitDetails.material.w < 0.0) {
            return color; 
        }
        r = scatterRay(hitDetails);
    }
    return color * 0.015625;
}

fn estimateColor(pixel: vec2<f32>) -> vec3<f32> {
    var c = vec3(0.0);
    for (var j = 0u; j < uniforms.samplesPerPixel; j = j + 1u) {
        c = c + trace(primaryRay(pixelSample(pixel)));
    };
    return c / f32(uniforms.samplesPerPixel);
}

@stage(fragment)
fn f_main(vertex: Vertex) -> @location(0) vec4<f32> {
    init(vertex);
    let c = estimateColor(vertex.xy);
    let m = max(c.x, max(c.y, c.z));
    return vec4(select(c, c / m, m > 1.0), 1.0);
}